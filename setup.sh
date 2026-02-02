#!/bin/bash

# KoreMD セットアップスクリプト
# このスクリプトは初期セットアップを自動化します

echo "🚀 KoreMD セットアップを開始します..."
echo ""

# Node.jsバージョンチェック
echo "📦 Node.jsバージョンを確認中..."
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ エラー: Node.js 18以上が必要です"
    echo "   現在のバージョン: $(node -v)"
    echo "   https://nodejs.org/ からインストールしてください"
    exit 1
fi
echo "✅ Node.js $(node -v) が見つかりました"
echo ""

# npmバージョンチェック
echo "📦 npmバージョンを確認中..."
NPM_VERSION=$(npm -v | cut -d'.' -f1)
if [ "$NPM_VERSION" -lt 9 ]; then
    echo "❌ エラー: npm 9以上が必要です"
    echo "   現在のバージョン: $(npm -v)"
    echo "   'npm install -g npm@latest' で更新してください"
    exit 1
fi
echo "✅ npm $(npm -v) が見つかりました"
echo ""

# メインの依存関係をインストール
echo "📦 メインの依存関係をインストール中..."
npm install
if [ $? -ne 0 ]; then
    echo "❌ エラー: 依存関係のインストールに失敗しました"
    exit 1
fi
echo "✅ メインの依存関係のインストール完了"
echo ""

# Wi-Fi Directプラグインをビルド
echo "🔧 Wi-Fi Directプラグインをビルド中..."
cd wifi-direct-plugin
npm install
if [ $? -ne 0 ]; then
    echo "❌ エラー: プラグインの依存関係のインストールに失敗しました"
    exit 1
fi

npm run build
if [ $? -ne 0 ]; then
    echo "❌ エラー: プラグインのビルドに失敗しました"
    exit 1
fi
cd ..
echo "✅ Wi-Fi Directプラグインのビルド完了"
echo ""

# Capacitorを同期
echo "🔄 Capacitorを同期中..."
npx cap sync android
if [ $? -ne 0 ]; then
    echo "❌ エラー: Capacitorの同期に失敗しました"
    exit 1
fi
echo "✅ Capacitorの同期完了"
echo ""

# 完了メッセージ
echo "🎉 セットアップが完了しました!"
echo ""
echo "次のステップ:"
echo "1. Android Studioを開く:"
echo "   npx cap open android"
echo ""
echo "2. または開発サーバーを起動:"
echo "   npm run dev"
echo ""
echo "詳細は README.md をご覧ください"
