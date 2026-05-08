#!/bin/bash
set -e

VERSION="2.3.8"
OUTPUT=~/cce-local-edition-v${VERSION}.zip
STAGING=~/cce-staging

echo "🧹 Cleaning staging..."
rm -rf $STAGING
mkdir -p $STAGING

echo "📦 Copying source..."
cp -r ~/cce-crypto/. $STAGING/

echo "🗑️  Stripping excluded files..."
rm -rf $STAGING/node_modules
rm -rf $STAGING/data
rm -rf $STAGING/logs
rm -rf $STAGING/backtest-results
rm -rf $STAGING/optimization-results
rm -rf $STAGING/dist
rm -rf $STAGING/.git
rm -rf $STAGING/reports
rm -f  $STAGING/.env
rm -f  $STAGING/proprietary.config.js
rm -f  $STAGING/*.db
rm -f  $STAGING/*.log

echo "📄 Injecting product ID..."
sed -i 's/your_product_id_here/uptecy/' $STAGING/.env.example

echo "🗜️  Zipping..."
cd ~
zip -r $OUTPUT cce-staging/ -x "*.DS_Store" -x "*Thumbs.db"

echo "🧹 Cleaning staging..."
rm -rf $STAGING

echo "✅ Done: $OUTPUT"
ls -lh $OUTPUT
