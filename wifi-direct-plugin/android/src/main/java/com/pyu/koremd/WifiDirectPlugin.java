package com.pyu.koremd;

import android.Manifest;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.location.LocationManager;
import android.net.NetworkInfo;
import android.net.wifi.WpsInfo;
import android.net.wifi.p2p.WifiP2pConfig;
import android.net.wifi.p2p.WifiP2pDevice;
import android.net.wifi.p2p.WifiP2pDeviceList;
import android.net.wifi.p2p.WifiP2pInfo;
import android.net.wifi.p2p.WifiP2pManager;
import android.net.wifi.p2p.nsd.WifiP2pDnsSdServiceInfo;
import android.net.wifi.p2p.nsd.WifiP2pDnsSdServiceRequest;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import androidx.annotation.NonNull;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.atomic.AtomicBoolean;

@CapacitorPlugin(
    name = "WifiDirect",
    permissions = {
        @Permission(
            alias = "location",
            strings = {
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION
            }
        ),
        @Permission(
            alias = "nearbyDevices",
            strings = {
                "android.permission.NEARBY_WIFI_DEVICES"
            }
        )
    }
)
public class WifiDirectPlugin extends Plugin {
    
    private static final String TAG = "WifiDirectPlugin";
    private static final int FILE_TRANSFER_PORT = 8988;
    
    private WifiP2pManager manager;
    private WifiP2pManager.Channel channel;
    private BroadcastReceiver receiver;
    private IntentFilter intentFilter;
    
    private final List<WifiP2pDevice> peers = new ArrayList<>();
    private WifiP2pInfo connectionInfo;
    private boolean isGroupOwner = false;
    private String groupOwnerAddress = null;
    
    private ServerSocket serverSocket;
    private Thread serverThread;
    private final AtomicBoolean isServerRunning = new AtomicBoolean(false);
    private final AtomicBoolean isServerStarting = new AtomicBoolean(false);  // 🔧 追加: 起動中フラグ
    private final Object serverLock = new Object();  // 🔧 追加: スレッドセーフ用ロック
    
    @Override
    public void load() {
        super.load();
        
        // IntentFilterの初期化
        intentFilter = new IntentFilter();
        intentFilter.addAction(WifiP2pManager.WIFI_P2P_STATE_CHANGED_ACTION);
        intentFilter.addAction(WifiP2pManager.WIFI_P2P_PEERS_CHANGED_ACTION);
        intentFilter.addAction(WifiP2pManager.WIFI_P2P_CONNECTION_CHANGED_ACTION);
        intentFilter.addAction(WifiP2pManager.WIFI_P2P_THIS_DEVICE_CHANGED_ACTION);
        
        Log.d(TAG, "WifiDirectPlugin loaded");
    }
    
    @PluginMethod
    public void initialize(PluginCall call) {
        Context context = getContext();
        
        manager = (WifiP2pManager) context.getSystemService(Context.WIFI_P2P_SERVICE);
        channel = manager.initialize(context, context.getMainLooper(), null);
        
        // 既存の接続をクリーンアップ
        if (manager != null && channel != null) {
            Log.d(TAG, "🧹 Cleaning up any existing Wi-Fi Direct connections...");
            
            // サーバーを停止
            stopFileServerInternal();
            
            // 既存の接続をキャンセル
            manager.cancelConnect(channel, new WifiP2pManager.ActionListener() {
                @Override
                public void onSuccess() {
                    Log.d(TAG, "✅ Cancelled any pending connections");
                }
                
                @Override
                public void onFailure(int reason) {
                    Log.d(TAG, "ℹ️ No pending connection to cancel");
                }
            });
            
            // ピア検索を停止
            manager.stopPeerDiscovery(channel, new WifiP2pManager.ActionListener() {
                @Override
                public void onSuccess() {
                    Log.d(TAG, "✅ Peer discovery stopped");
                }
                
                @Override
                public void onFailure(int reason) {
                    Log.d(TAG, "ℹ️ No peer discovery to stop: " + getErrorMessage(reason));
                }
            });
            
            // グループを削除
            manager.removeGroup(channel, new WifiP2pManager.ActionListener() {
                @Override
                public void onSuccess() {
                    Log.d(TAG, "✅ Existing group removed");
                }
                
                @Override
                public void onFailure(int reason) {
                    Log.d(TAG, "ℹ️ No existing group to remove: " + getErrorMessage(reason));
                }
            });
            
            // 状態をリセット
            connectionInfo = null;
            isGroupOwner = false;
            groupOwnerAddress = null;
            isServerRunning.set(false);
            isServerStarting.set(false);  // 🔧 起動中フラグもリセット
            
            // クリーンアップ完了後に少し待機してから初期化を完了
            Log.d(TAG, "⏳ Waiting 2 seconds for cleanup to complete...");
            new Handler(Looper.getMainLooper()).postDelayed(() -> {
                completeInitialization(call);
            }, 2000); // 2秒待機
            return;
        }
        
        completeInitialization(call);
    }

    // 初期化完了処理を分離
    private void completeInitialization(PluginCall call) {
        intentFilter = new IntentFilter();
        intentFilter.addAction(WifiP2pManager.WIFI_P2P_STATE_CHANGED_ACTION);
        intentFilter.addAction(WifiP2pManager.WIFI_P2P_PEERS_CHANGED_ACTION);
        intentFilter.addAction(WifiP2pManager.WIFI_P2P_CONNECTION_CHANGED_ACTION);
        intentFilter.addAction(WifiP2pManager.WIFI_P2P_THIS_DEVICE_CHANGED_ACTION);
        
        registerReceiver();
        
        // 権限チェック
        checkPermissions(call);
    }
    
    private void verifyRequiredPermissions(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            // Android 13+
            if (getContext().checkSelfPermission(Manifest.permission.NEARBY_WIFI_DEVICES)
                    != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                Log.w(TAG, "NEARBY_WIFI_DEVICES permission not granted");
                call.reject("NEARBY_WIFI_DEVICES permission required");
                return;
            }
        } else {
            // Android 12以下
            if (getContext().checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION)
                    != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                Log.w(TAG, "ACCESS_FINE_LOCATION permission not granted");
                call.reject("ACCESS_FINE_LOCATION permission required");
                return;
            }
        }
        
        // 権限OK
        Log.d(TAG, "All required permissions granted");
        JSObject result = new JSObject();
        result.put("success", true);
        result.put("permissionsGranted", true);
        call.resolve(result);
    }
    
    @PluginMethod
    public void discoverPeers(PluginCall call) {
        if (manager == null || channel == null) {
            call.reject("Wi-Fi Direct not initialized");
            return;
        }
        
        // Android 12以下の場合、位置情報サービスが有効か確認
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            LocationManager locationManager = (LocationManager) getContext().getSystemService(Context.LOCATION_SERVICE);
            boolean isLocationEnabled = locationManager != null && 
                (locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER) || 
                 locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER));
            
            if (!isLocationEnabled) {
                Log.e(TAG, "Location services are disabled");
                call.reject("位置情報サービスを有効にしてください");
                return;
            }
        }
        
        Log.d(TAG, "Starting peer discovery...");
        
        manager.discoverPeers(channel, new WifiP2pManager.ActionListener() {
            @Override
            public void onSuccess() {
                Log.d(TAG, "Peer discovery started successfully");
                JSObject result = new JSObject();
                result.put("success", true);
                call.resolve(result);
            }
            
            @Override
            public void onFailure(int reason) {
                String errorMsg = getErrorMessage(reason);
                Log.e(TAG, "Peer discovery failed: " + errorMsg + " (reason code: " + reason + ")");
                call.reject("Peer discovery failed: " + errorMsg);
            }
        });
    }
    
    @PluginMethod
    public void stopPeerDiscovery(PluginCall call) {
        if (manager == null || channel == null) {
            call.reject("Wi-Fi Direct not initialized");
            return;
        }
        
        manager.stopPeerDiscovery(channel, new WifiP2pManager.ActionListener() {
            @Override
            public void onSuccess() {
                Log.d(TAG, "Peer discovery stopped");
                JSObject result = new JSObject();
                result.put("success", true);
                call.resolve(result);
            }
            
            @Override
            public void onFailure(int reason) {
                call.reject("Failed to stop discovery: " + getErrorMessage(reason));
            }
        });
    }
    
    @PluginMethod
    public void connectToPeer(PluginCall call) {
        String deviceAddress = call.getString("deviceAddress");
        Integer groupOwnerIntent = call.getInt("groupOwnerIntent", -1);
        
        if (deviceAddress == null || deviceAddress.isEmpty()) {
            call.reject("Device address is required");
            return;
        }
        
        if (manager == null || channel == null) {
            call.reject("Wi-Fi Direct not initialized");
            return;
        }
        
        Log.d(TAG, "🔄 Attempting to connect to " + deviceAddress + " with groupOwnerIntent=" + groupOwnerIntent);
        
        // 既存の接続をキャンセル
        manager.cancelConnect(channel, new WifiP2pManager.ActionListener() {
            @Override
            public void onSuccess() {
                Log.d(TAG, "✅ Previous connection cancelled successfully");
                // ⚠️ ピア検索を停止しない！
                // ピア検索を継続したまま接続する（接続確立後にシステムが自動停止）
                Log.d(TAG, "⚠️ Skipping peer discovery stop - connecting directly");
                proceedWithConnection(call, deviceAddress, groupOwnerIntent);
            }
            
            @Override
            public void onFailure(int reason) {
                Log.d(TAG, "ℹ️ No previous connection to cancel (this is normal)");
                // ⚠️ ピア検索を停止しない！
                Log.d(TAG, "⚠️ Skipping peer discovery stop - connecting directly");
                proceedWithConnection(call, deviceAddress, groupOwnerIntent);
            }
        });
    }
    
    private void proceedWithConnection(PluginCall call, String deviceAddress, int groupOwnerIntent) {
        Log.d(TAG, "⏳ Waiting 200ms after cancelConnect...");
        // ⏰ cancelConnect の後、短い遅延を追加
        new Handler(Looper.getMainLooper()).postDelayed(() -> {
            Log.d(TAG, "🔒 Checking permissions...");
            // 🔒 実行時権限チェック
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                // Android 13+
                if (getContext().checkSelfPermission("android.permission.NEARBY_WIFI_DEVICES")
                        != PackageManager.PERMISSION_GRANTED) {
                    Log.e(TAG, "❌ NEARBY_WIFI_DEVICES permission not granted");
                    call.reject("付近のデバイス権限が必要です。設定 → アプリ → KoreMD → 権限");
                    return;
                }
                Log.d(TAG, "✅ NEARBY_WIFI_DEVICES permission granted");
            } else {
                // Android 12以下
                if (getContext().checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION)
                        != PackageManager.PERMISSION_GRANTED) {
                    Log.e(TAG, "❌ ACCESS_FINE_LOCATION permission not granted");
                    call.reject("位置情報権限が必要です。設定 → アプリ → KoreMD → 権限");
                    return;
                }
                Log.d(TAG, "✅ ACCESS_FINE_LOCATION permission granted");
                
                // 位置情報サービスのチェック
                LocationManager locationManager = (LocationManager) getContext().getSystemService(Context.LOCATION_SERVICE);
                if (locationManager != null) {
                    boolean gpsEnabled = locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER);
                    boolean networkEnabled = locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER);
                    
                    Log.d(TAG, "Location services - GPS: " + gpsEnabled + ", Network: " + networkEnabled);
                    
                    if (!gpsEnabled && !networkEnabled) {
                        Log.e(TAG, "❌ Location services are disabled");
                        call.reject("位置情報サービスを有効にしてください。設定 → 位置情報 → ON");
                        return;
                    }
                    Log.d(TAG, "✅ Location services enabled");
                }
            }
            
            WifiP2pConfig config = new WifiP2pConfig();
            config.deviceAddress = deviceAddress;
            config.wps.setup = WpsInfo.PBC;
            config.groupOwnerIntent = groupOwnerIntent;
            
            Log.d(TAG, "📡 Sending connection request to " + deviceAddress);
            Log.d(TAG, "   Config - groupOwnerIntent: " + groupOwnerIntent + ", wps: " + config.wps.setup);
            
            manager.connect(channel, config, new WifiP2pManager.ActionListener() {
                @Override
                public void onSuccess() {
                    Log.d(TAG, "✅ Connection request sent successfully to: " + deviceAddress);
                    Log.d(TAG, "⏳ Waiting for user acceptance on the other device...");
                    JSObject result = new JSObject();
                    result.put("success", true);
                    result.put("deviceAddress", deviceAddress);
                    call.resolve(result);
                }
                
                @Override
                public void onFailure(int reason) {
                    String errorMsg = getDetailedErrorMessage(reason);
                    Log.e(TAG, "❌ Connection request failed: " + errorMsg + " (code: " + reason + ")");
                    call.reject("Connection failed: " + errorMsg);
                }
            });
        }, 200);  // 200ms待機（cancelConnect後の短い待機）
    }
    
    // より詳細なエラーメッセージを返す
    private String getDetailedErrorMessage(int reason) {
        switch (reason) {
            case WifiP2pManager.ERROR:
                return "Internal error - Wi-Fiと位置情報サービスが有効か確認し、少し待ってから再試行してください";
            case WifiP2pManager.P2P_UNSUPPORTED:
                return "このデバイスはWi-Fi Directに対応していません";
            case WifiP2pManager.BUSY:
                return "システムがビジー状態です - 「共有を停止」して数秒待ってから再試行してください";
            case WifiP2pManager.NO_SERVICE_REQUESTS:
                return "サービスリクエストがありません";
            default:
                return "Unknown error (code: " + reason + ")";
        }
    }
    
    @PluginMethod
    public void disconnect(PluginCall call) {
        if (manager == null || channel == null) {
            call.reject("Wi-Fi Direct not initialized");
            return;
        }
        
        // サーバーを停止
        stopFileServerInternal();
        
        // ピア検索を停止
        manager.stopPeerDiscovery(channel, null);
        
        manager.removeGroup(channel, new WifiP2pManager.ActionListener() {
            @Override
            public void onSuccess() {
                Log.d(TAG, "Disconnected successfully");
                connectionInfo = null;
                isGroupOwner = false;
                groupOwnerAddress = null;
                
                // 状態をリセット
                try {
                    Thread.sleep(500);
                } catch (InterruptedException e) {
                    Log.e(TAG, "Sleep interrupted", e);
                }
                
                JSObject result = new JSObject();
                result.put("success", true);
                call.resolve(result);
            }
            
            @Override
            public void onFailure(int reason) {
                // 失敗してもリセット
                connectionInfo = null;
                isGroupOwner = false;
                groupOwnerAddress = null;
                
                call.reject("Disconnect failed: " + getErrorMessage(reason));
            }
        });
    }

    // ✅ NEW: Autonomous Group Owner として起動
    @PluginMethod
    public void createGroup(PluginCall call) {
        if (manager == null || channel == null) {
            call.reject("Wi-Fi Direct not initialized");
            return;
        }
        
        Log.d(TAG, "🏗️ Creating Autonomous Group Owner...");
        
        manager.createGroup(channel, new WifiP2pManager.ActionListener() {
            @Override
            public void onSuccess() {
                Log.d(TAG, "✅ Autonomous Group Owner created successfully");
                Log.d(TAG, "📡 This device is now a Group Owner (Server)");
                Log.d(TAG, "⏳ Waiting for other devices to connect...");
                
                JSObject result = new JSObject();
                result.put("success", true);
                call.resolve(result);
            }
            
            @Override
            public void onFailure(int reason) {
                String errorMsg = getErrorMessage(reason);
                Log.e(TAG, "❌ Failed to create Group Owner: " + errorMsg + " (reason code: " + reason + ")");
                call.reject("Failed to create Group Owner: " + errorMsg);
            }
        });
    }
    
    // ✅ NEW: グループを削除
    @PluginMethod
    public void removeGroup(PluginCall call) {
        if (manager == null || channel == null) {
            call.reject("Wi-Fi Direct not initialized");
            return;
        }
        
        Log.d(TAG, "🗑️ Removing Wi-Fi Direct group...");
        
        manager.removeGroup(channel, new WifiP2pManager.ActionListener() {
            @Override
            public void onSuccess() {
                Log.d(TAG, "✅ Group removed successfully");
                
                // 状態をリセット
                connectionInfo = null;
                isGroupOwner = false;
                groupOwnerAddress = null;
                
                JSObject result = new JSObject();
                result.put("success", true);
                call.resolve(result);
            }
            
            @Override
            public void onFailure(int reason) {
                Log.w(TAG, "⚠️ Failed to remove group (may not exist): " + getErrorMessage(reason));
                
                // 失敗しても状態をリセット
                connectionInfo = null;
                isGroupOwner = false;
                groupOwnerAddress = null;
                
                // グループが存在しない場合も成功とする
                JSObject result = new JSObject();
                result.put("success", true);
                call.resolve(result);
            }
        });
    }

    @PluginMethod
    public void sendFile(PluginCall call) {
        String filePath = call.getString("filePath");
        String hostAddress = call.getString("hostAddress");
        Integer port = call.getInt("port", FILE_TRANSFER_PORT);
        
        if (filePath == null || filePath.isEmpty()) {
            call.reject("File path is required");
            return;
        }
        
        if (hostAddress == null || hostAddress.isEmpty()) {
            call.reject("Host address is required");
            return;
        }
        
        // 別スレッドでファイル送信
        new Thread(() -> {
            Socket socket = null;
            OutputStream outputStream = null;
            FileInputStream fileInputStream = null;
            
            try {
                File file = new File(filePath);
                
                if (!file.exists()) {
                    call.reject("File not found: " + filePath);
                    return;
                }
                
                long fileSize = file.length();
                
                Log.d(TAG, "Connecting to " + hostAddress + ":" + port);
                
                socket = new Socket();
                socket.bind(null);
                socket.connect(new InetSocketAddress(hostAddress, port), 10000);
                
                outputStream = socket.getOutputStream();
                fileInputStream = new FileInputStream(file);
                
                // ファイル名を送信（最初の256バイト）
                byte[] fileNameBytes = file.getName().getBytes("UTF-8");
                byte[] header = new byte[256];
                System.arraycopy(fileNameBytes, 0, header, 0, 
                    Math.min(fileNameBytes.length, 255));
                outputStream.write(header);
                
                // ファイルサイズを送信（8バイト）
                ByteArrayOutputStream baos = new ByteArrayOutputStream();
                DataOutputStream dos = new DataOutputStream(baos);
                dos.writeLong(fileSize);
                outputStream.write(baos.toByteArray());
                
                // ファイルデータを送信
                byte[] buffer = new byte[8192];
                int bytesRead;
                long totalBytes = 0;
                long lastProgressUpdate = 0;
                
                while ((bytesRead = fileInputStream.read(buffer)) != -1) {
                    outputStream.write(buffer, 0, bytesRead);
                    totalBytes += bytesRead;
                    
                    // 進捗通知（100KBごと）
                    if (totalBytes - lastProgressUpdate > 102400) {
                        notifyProgress(totalBytes, fileSize);
                        lastProgressUpdate = totalBytes;
                    }
                }
                
                outputStream.flush();
                
                // 最終進捗通知
                notifyProgress(fileSize, fileSize);
                
                Log.d(TAG, "File sent successfully: " + totalBytes + " bytes");
                
                JSObject result = new JSObject();
                result.put("success", true);
                result.put("bytesTransferred", totalBytes);
                result.put("fileName", file.getName());
                call.resolve(result);
                
            } catch (IOException e) {
                Log.e(TAG, "File transfer error", e);
                call.reject("File transfer failed: " + e.getMessage());
            } finally {
                closeQuietly(fileInputStream);
                closeQuietly(outputStream);
                closeQuietly(socket);
            }
        }).start();
    }
    
    @PluginMethod
    public void startFileServer(PluginCall call) {
        String savePath = call.getString("savePath");
        int port = call.getInt("port", FILE_TRANSFER_PORT);

        if (savePath == null || savePath.isEmpty()) {
            call.reject("Save path is required");
            return;
        }

        // 🔧 修正: 既に起動中の場合は重複呼び出しを拒否
        if (!isServerStarting.compareAndSet(false, true)) {
            Log.d(TAG, "⚠️ Server already starting, rejecting duplicate call");
            JSObject result = new JSObject();
            result.put("success", true);
            result.put("alreadyStarting", true);
            call.resolve(result);
            return;
        }

        // 🔧 修正: synchronized ブロックでスレッドセーフに
        synchronized (serverLock) {
            // 🔧 修正: 既にサーバーが動いている場合は再利用
            if (serverSocket != null && !serverSocket.isClosed() && isServerRunning.get()) {
                Log.d(TAG, "♻️ File server already running on port " + port + ", reusing...");
                isServerStarting.set(false);  // 🔧 フラグを下げる
                JSObject result = new JSObject();
                result.put("success", true);
                result.put("port", port);
                result.put("reused", true);
                call.resolve(result);
                return;
            }

            // 既存のサーバーを完全に停止
            stopFileServerInternal();
            
            // ポートが解放されるまで待つ
            try {
                Thread.sleep(500);
            } catch (InterruptedException e) {
                Log.e(TAG, "Sleep interrupted", e);
            }

            // 保存パスを保存（複数回の受信で使用）
            final String baseSavePath = savePath;

            serverThread = new Thread(() -> {
            try {
                serverSocket = new ServerSocket(port);
                serverSocket.setReuseAddress(true);
                isServerRunning.set(true);
                isServerStarting.set(false);  // 🔧 ServerSocket作成完了、フラグを下げる
                
                Log.d(TAG, "📡 File server started on port " + port);
                
                JSObject startResult = new JSObject();
                startResult.put("success", true);
                startResult.put("port", port);
                call.resolve(startResult);
                
                // 🔧 修正: 無限ループで複数のファイル転送を受信
                while (isServerRunning.get() && !serverSocket.isClosed()) {
                    Socket client = null;
                    InputStream inputStream = null;
                    FileOutputStream fileOutputStream = null;
                    
                    try {
                        Log.d(TAG, "⏳ Waiting for client connection...");
                        
                        // クライアント接続を待機
                        client = serverSocket.accept();
                        Log.d(TAG, "✅ Client connected: " + client.getInetAddress());
                        
                        inputStream = client.getInputStream();
                        
                        // ファイル名を受信（256バイト）
                        byte[] header = new byte[256];
                        inputStream.read(header);
                        String fileName = new String(header, "UTF-8").trim();
                        fileName = fileName.replaceAll("[\\x00]", ""); // null文字を削除
                        
                        if (fileName.isEmpty()) {
                            fileName = "received_file_" + System.currentTimeMillis();
                        }
                        
                        // ファイルサイズを受信（8バイト）
                        byte[] sizeBytes = new byte[8];
                        inputStream.read(sizeBytes);
                        DataInputStream dis = new DataInputStream(
                            new ByteArrayInputStream(sizeBytes)
                        );
                        long fileSize = dis.readLong();
                        
                        Log.d(TAG, "📥 Receiving file: " + fileName + " (" + fileSize + " bytes)");
                        
                        // タイムスタンプ付きのファイル名を生成
                        String timestamp = String.valueOf(System.currentTimeMillis());
                        String uniqueSavePath = baseSavePath.replace(
                            new File(baseSavePath).getName(),
                            "markdown_" + timestamp + ".md"
                        );
                        
                        // 保存ディレクトリを作成
                        File saveDir = new File(uniqueSavePath).getParentFile();
                        if (saveDir != null && !saveDir.exists()) {
                            saveDir.mkdirs();
                        }
                        
                        // ファイルを受信
                        File outputFile = new File(uniqueSavePath);
                        fileOutputStream = new FileOutputStream(outputFile);
                        
                        byte[] buffer = new byte[8192];
                        int bytesRead;
                        long totalBytes = 0;
                        long lastProgressUpdate = 0;
                        
                        while (totalBytes < fileSize && 
                               (bytesRead = inputStream.read(buffer)) != -1) {
                            fileOutputStream.write(buffer, 0, bytesRead);
                            totalBytes += bytesRead;
                            
                            // 進捗通知（100KBごと）
                            if (totalBytes - lastProgressUpdate > 102400) {
                                notifyProgress(totalBytes, fileSize);
                                lastProgressUpdate = totalBytes;
                            }
                        }
                        
                        fileOutputStream.flush();
                        
                        // 最終進捗通知
                        notifyProgress(fileSize, fileSize);
                        
                        Log.d(TAG, "✅ File received successfully: " + totalBytes + " bytes");
                        
                        // ファイル内容を読み込む
                        String fileContent = "";
                        try {
                            FileInputStream fis = new FileInputStream(outputFile);
                            byte[] contentBytes = new byte[(int) outputFile.length()];
                            fis.read(contentBytes);
                            fis.close();
                            fileContent = new String(contentBytes, "UTF-8");
                            Log.d(TAG, "📄 File content loaded: " + fileContent.length() + " characters");
                        } catch (Exception e) {
                            Log.e(TAG, "Failed to read file content", e);
                        }
                        
                        // 受信完了通知（内容も含める）
                        JSObject completeResult = new JSObject();
                        completeResult.put("success", true);
                        completeResult.put("bytesReceived", totalBytes);
                        completeResult.put("filePath", outputFile.getAbsolutePath());
                        completeResult.put("fileName", fileName);
                        completeResult.put("fileContent", fileContent);
                        
                        notifyListeners("fileReceived", completeResult);
                        
                        Log.d(TAG, "🔄 Ready to receive next file...");
                        
                    } catch (IOException e) {
                        // ServerSocketが閉じられた場合は正常終了
                        if (serverSocket != null && serverSocket.isClosed()) {
                            Log.d(TAG, "Server socket closed, exiting receive loop");
                            break;
                        }
                        
                        Log.e(TAG, "File receive error", e);
                        
                        if (isServerRunning.get()) {
                            JSObject errorResult = new JSObject();
                            errorResult.put("error", e.getMessage());
                            notifyListeners("fileReceiveError", errorResult);
                        }
                    } finally {
                        // クライアント接続のみクローズ（ServerSocketは維持）
                        closeQuietly(fileOutputStream);
                        closeQuietly(inputStream);
                        closeQuietly(client);
                    }
                }
                
                Log.d(TAG, "📡 File server stopped");
                
            } catch (IOException e) {
                Log.e(TAG, "Failed to start file server", e);
                isServerStarting.set(false);  // 🔧 エラー時もフラグを下げる
                
                JSObject errorResult = new JSObject();
                errorResult.put("error", e.getMessage());
                notifyListeners("fileReceiveError", errorResult);
                
                call.reject("Failed to start server: " + e.getMessage());
            } finally {
                isServerRunning.set(false);
                
                // ServerSocketを閉じる
                closeQuietly(serverSocket);
                serverSocket = null;
            }
        });
        
        serverThread.start();
        } // synchronized (serverLock) の終わり
    }
    
    @PluginMethod
    public void stopFileServer(PluginCall call) {
        stopFileServerInternal();
        
        JSObject result = new JSObject();
        result.put("success", true);
        call.resolve(result);
    }
    
    private void stopFileServerInternal() {
        synchronized (serverLock) {
            isServerRunning.set(false);
            isServerStarting.set(false);  // 🔧 起動中フラグもリセット
            
            if (serverSocket != null) {
                try {
                    serverSocket.close();
                } catch (IOException e) {
                    Log.e(TAG, "Error closing server socket", e);
                }
                serverSocket = null;
            }
            
            if (serverThread != null && serverThread.isAlive()) {
                serverThread.interrupt();
                serverThread = null;
            }
        }
    }
    
    private void registerReceiver() {
        receiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                String action = intent.getAction();
                
                if (WifiP2pManager.WIFI_P2P_STATE_CHANGED_ACTION.equals(action)) {
                    handleStateChanged(intent);
                }
                else if (WifiP2pManager.WIFI_P2P_PEERS_CHANGED_ACTION.equals(action)) {
                    handlePeersChanged();
                }
                else if (WifiP2pManager.WIFI_P2P_CONNECTION_CHANGED_ACTION.equals(action)) {
                    handleConnectionChanged(intent);
                }
                else if (WifiP2pManager.WIFI_P2P_THIS_DEVICE_CHANGED_ACTION.equals(action)) {
                    handleThisDeviceChanged(intent);
                }
            }
        };
        
        getContext().registerReceiver(receiver, intentFilter);
    }
    
    private void handleStateChanged(Intent intent) {
        int state = intent.getIntExtra(WifiP2pManager.EXTRA_WIFI_STATE, -1);
        
        JSObject data = new JSObject();
        data.put("enabled", state == WifiP2pManager.WIFI_P2P_STATE_ENABLED);
        
        notifyListeners("wifiP2pStateChanged", data);
        
        Log.d(TAG, "Wi-Fi P2P state: " + 
            (state == WifiP2pManager.WIFI_P2P_STATE_ENABLED ? "enabled" : "disabled"));
    }
    
    private void handlePeersChanged() {
        if (manager == null || channel == null) {
            return;
        }
        
        manager.requestPeers(channel, peerList -> {
            peers.clear();
            peers.addAll(peerList.getDeviceList());
            
            Log.d(TAG, "=== Peers Changed Event ===");
            Log.d(TAG, "Found " + peers.size() + " peer(s)");
            
            try {
                JSONArray peersArray = new JSONArray();
                
                for (WifiP2pDevice device : peers) {
                    JSONObject peer = new JSONObject();
                    peer.put("deviceName", device.deviceName);
                    peer.put("deviceAddress", device.deviceAddress);
                    peer.put("primaryDeviceType", device.primaryDeviceType);
                    peer.put("secondaryDeviceType", device.secondaryDeviceType);
                    peer.put("status", getDeviceStatus(device.status));
                    
                    Log.d(TAG, "  Device: " + device.deviceName);
                    Log.d(TAG, "    Address: " + device.deviceAddress);
                    Log.d(TAG, "    Status: " + getDeviceStatus(device.status) + " (" + device.status + ")");
                    
                    peersArray.put(peer);
                }
                
                JSObject data = new JSObject();
                data.put("peers", peersArray);
                
                notifyListeners("peersChanged", data);
                Log.d(TAG, "=== End Peers Changed Event ===");
                
            } catch (JSONException e) {
                Log.e(TAG, "Error creating peers JSON", e);
            }
        });
    }
    
    private void handleConnectionChanged(Intent intent) {
        if (manager == null || channel == null) {
            return;
        }
        
        NetworkInfo networkInfo = intent.getParcelableExtra(WifiP2pManager.EXTRA_NETWORK_INFO);
        
        Log.d(TAG, "=== Connection Changed Event ===");
        if (networkInfo != null) {
            Log.d(TAG, "NetworkInfo state: " + networkInfo.getState());
            Log.d(TAG, "NetworkInfo detailed state: " + networkInfo.getDetailedState());
            Log.d(TAG, "NetworkInfo isConnected: " + networkInfo.isConnected());
        }
        
        if (networkInfo != null && networkInfo.isConnected()) {
            Log.d(TAG, "Network is connected, requesting connection info...");
            // 接続情報を取得
            manager.requestConnectionInfo(channel, info -> {
                connectionInfo = info;
                isGroupOwner = info.isGroupOwner;
                
                if (info.groupOwnerAddress != null) {
                    groupOwnerAddress = info.groupOwnerAddress.getHostAddress();
                }
                
                Log.d(TAG, "✅ Connected successfully!");
                Log.d(TAG, "Group Formed: " + info.groupFormed);
                Log.d(TAG, "Is Group Owner: " + isGroupOwner);
                Log.d(TAG, "Group Owner Address: " + groupOwnerAddress);
                
                JSObject data = new JSObject();
                data.put("groupFormed", info.groupFormed);
                data.put("isGroupOwner", isGroupOwner);
                data.put("groupOwnerAddress", groupOwnerAddress);
                
                notifyListeners("connectionChanged", data);
            });
        } else {
            // 切断された
            Log.d(TAG, "❌ Connection lost or not established");
            connectionInfo = null;
            isGroupOwner = false;
            groupOwnerAddress = null;
            
            JSObject data = new JSObject();
            data.put("groupFormed", false);
            data.put("isGroupOwner", false);
            data.put("groupOwnerAddress", null);
            
            notifyListeners("connectionChanged", data);
            
            Log.d(TAG, "Disconnected");
        }
        Log.d(TAG, "=== End Connection Changed Event ===");
    }
    
    private void handleThisDeviceChanged(Intent intent) {
        WifiP2pDevice device = intent.getParcelableExtra(
            WifiP2pManager.EXTRA_WIFI_P2P_DEVICE
        );
        
        if (device != null) {
            Log.d(TAG, "This device: " + device.deviceName + " (" + device.deviceAddress + ")");
        }
    }
    
    private void notifyProgress(long bytesTransferred, long totalBytes) {
        JSObject data = new JSObject();
        data.put("bytesTransferred", bytesTransferred);
        data.put("totalBytes", totalBytes);
        data.put("progress", (double) bytesTransferred / totalBytes);
        
        notifyListeners("transferProgress", data);
    }
    
    private String getErrorMessage(int reason) {
        switch (reason) {
            case WifiP2pManager.ERROR:
                return "Internal error - Wi-Fiと位置情報サービスを確認してください";
            case WifiP2pManager.P2P_UNSUPPORTED:
                return "Wi-Fi Direct is not supported";
            case WifiP2pManager.BUSY:
                return "System is busy - 少し待ってから再試行してください";
            case WifiP2pManager.NO_SERVICE_REQUESTS:
                return "No service requests";
            default:
                return "Unknown error: " + reason;
        }
    }
    
    private String getDeviceStatus(int status) {
        switch (status) {
            case WifiP2pDevice.CONNECTED:
                return "connected";
            case WifiP2pDevice.INVITED:
                return "invited";
            case WifiP2pDevice.FAILED:
                return "failed";
            case WifiP2pDevice.AVAILABLE:
                return "available";
            case WifiP2pDevice.UNAVAILABLE:
                return "unavailable";
            default:
                return "unknown";
        }
    }
    
    private void closeQuietly(Closeable closeable) {
        if (closeable != null) {
            try {
                closeable.close();
            } catch (IOException e) {
                // Ignore
            }
        }
    }
    
    private void closeQuietly(Socket socket) {
        if (socket != null) {
            try {
                socket.close();
            } catch (IOException e) {
                // Ignore
            }
        }
    }
    
    private void closeQuietly(ServerSocket socket) {
        if (socket != null) {
            try {
                socket.close();
            } catch (IOException e) {
                // Ignore
            }
        }
    }
    
    @Override
    protected void handleOnDestroy() {
        // サーバーを停止
        stopFileServerInternal();
        
        // BroadcastReceiverの解除
        if (receiver != null) {
            try {
                getContext().unregisterReceiver(receiver);
            } catch (IllegalArgumentException e) {
                // Already unregistered
            }
            receiver = null;
        }
        
        // Wi-Fi Directの切断
        if (manager != null && channel != null) {
            manager.removeGroup(channel, null);
        }
        
        super.handleOnDestroy();
    }
}