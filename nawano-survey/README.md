# 縄野測量 ホームページ（モック）

HTML / CSS / JavaScript のみ。外部のライブラリ・フォント・解析タグは使っていません。
ビルド工程はなく、このフォルダをそのまま S3 に置けば公開できます。

## 構成

```
index.html       トップ
services.html    業務内容
flow.html        ご依頼の流れ・納期（納期の目安ツール）・費用の目安
works.html       実績
about.html       会社概要・代表者メッセージ
column.html      コラム（not/on へのリンクと一覧）
faq.html         よくある質問
contact.html     案件の相談・見積依頼（窓口）
privacy.html     プライバシーポリシー（雛形）
assets/css/style.css   色・書体・余白は先頭の :root で一元管理
assets/img/representative.jpg   代表者の写真（会社概要とトップで使用）
assets/js/config.js    ダミー表示の ON/OFF、宛先メール、not/on の URL
assets/js/main.js      メニュー開閉、モック帯
assets/js/columns.js   コラム一覧（現在はダミーデータ）
assets/js/contact.js   問い合わせフォーム
assets/js/schedule.js  納期の目安ツール
```

ヘッダー・フッターは各 HTML に直書きしています。ナビや連絡先を変えるときは、全ページを検索置換してください。

## 演出

- トップのヘッダーのロゴは、縄が1本伸びて4本の杭をつなぎ、ロゴの形になる演出があります（`style.css` の `.is-intro`）。続けて、ヒーローの測量図が描かれます。
- 他のページのロゴは静止です。OSの「視差効果を減らす」設定では、トップも静止します。
- 演出をやめるには、`index.html` の `class="brand is-intro"` から `is-intro` を外します。

## 本人に見せる前の注意

`assets/js/config.js` の `markDummy: true` にすると、差し替え対象（ダミーの値）に点線の下線・枠が付きます。差し替え漏れの確認に使います。

## 差し替えが必要な箇所（ダミー）

| 項目 | 現在の値 | 場所 |
|---|---|---|
| 電話番号 | 03-0000-0000 | 全 HTML（検索置換）、`tel:+81300000000` も |
| メール | info@nawano-survey.example | 全 HTML、`config.js` |
| 所在地・営業時間 | 〇〇県〇〇市… / 平日 9:00〜18:00 | フッター、about、privacy |
| 氏名・登録番号 | 縄野 〇〇 / 第00000号 | トップ、about、フッター |
| 代表者メッセージ | 仮の文面（点線で囲んだ部分） | about |
| 実績の数字 | 1,280 件、業務別件数、事例 | index、works |
| 対応エリア | 〇〇県全域 | index、about、faq |
| 費用の目安 | flow.html の表 | flow |
| 納期・工程の日数 | 各業務の目安、逆算ツールの日数 | services、flow、`schedule.js` |
| 使用機器 | 一般的な機器の例 | about（会社概要） |
| お知らせ | 3 件のダミー | index |
| コラム | ダミー 6 件、リンク先は存在しない | `columns.js` |
| ドメイン | nawano-survey.example | `sitemap.xml`、`robots.txt` |

## コラム（not/on 連携）

`columns.js` の `loadColumns()` がダミーデータを返しています。
not/on 側に RSS 相当の機能ができたら、この関数の中身を `fetch` に差し替えるだけで済みます（描画側は変更不要）。
記事リンクは新しいタブで開く設定です（`columns.js` と `column.html`）。同一タブにする場合は `target="_blank"` を外してください。

## 問い合わせ窓口の仕組み

サーバーを持たないため、次の 3 通りで届きます。

1. 「メールで送る」：入力内容を入れたメールをメールソフトに作成する（送信は依頼者側）
2. 「内容をコピーする」：整形した文面をコピーして、メールに貼り付けてもらう
3. 電話：全ページの画面下（スマホ）とヘッダー・フッターに導線あり

`mailto:` は依頼者のメール環境に依存し、事務所側では送信の完了を確認できません。
受信の取りこぼしを避けたくなったら、API Gateway + Lambda + SES を後から足せる構成にしてあります（フォームの送信処理は `contact.js` の `openMail()` だけ）。

## デプロイ（S3 + CloudFront）

```sh
aws s3 sync . s3://<バケット名> --exclude "README.md" --delete
aws cloudfront create-invalidation --distribution-id <ID> --paths "/*.html" "/assets/*"
```

## 公開前の確認事項

- 業務範囲：本人が土地家屋調査士ではないため、境界確定・筆界の確認・登記申請は掲載していません。
  掲載する業務の範囲と表現は、公開前に本人（必要なら専門家）に確認してください。
- 測量士の登録番号、実績の数字、取引先の声は、本人の許可と事実の確認が取れたものだけを載せてください。
- 代表者の写真は提供されたものを使用しています。サイトへの掲載について、本人の了承を確認してください。
- プライバシーポリシーは雛形です。内容の確認が必要です。
- 構造化データ（LocalBusiness の JSON-LD）は、実際の事務所情報が確定してから追加します。
- `Content-Security-Policy` などのレスポンスヘッダーは CloudFront のレスポンスヘッダーポリシーで設定します（このサイトはインラインのスクリプトを使っていません。一部のHTMLに `style` 属性があるため、`style-src` を厳しくする場合は事前に外してください）。
