import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
});

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <h2 className="text-base font-semibold text-gray-800 mb-3 pb-1 border-b border-gray-200">
        {title}
      </h2>
      <div className="text-sm text-gray-600 leading-relaxed space-y-2">
        {children}
      </div>
    </section>
  );
}

function PrivacyPage() {
  return (
    <main className="min-h-screen bg-gray-50 flex justify-center px-4 py-10">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-sm px-6 py-8">
        <div className="mb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
          >
            <ChevronLeft className="size-4" />
            トップに戻る
          </Link>
          <h1 className="text-xl font-bold text-gray-900 mt-4">
            プライバシーポリシー
          </h1>
          <p className="text-xs text-gray-400 mt-1">最終更新: 2026年6月5日</p>
        </div>

        <Section title="1. 運営者">
          <p>
            屋号・名称: ピータン
            <br />
            お問い合わせ:{" "}
            <a
              href="mailto:pitang1965@gmail.com"
              className="text-pink-500 underline underline-offset-2"
            >
              pitang1965@gmail.com
            </a>
          </p>
          <p>
            本サービス「なふだ」（以下「本サービス」）は13歳以上の方を対象としています。
            13歳未満の方はご利用いただけません。
          </p>
        </Section>

        <Section title="2. 収集する情報">
          <p>本サービスでは以下の情報を収集します。</p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>
              <span className="font-medium text-gray-700">アカウント情報</span>
              ：Google・Facebookでのログイン時に取得する氏名・メールアドレス・プロフィール画像
            </li>
            <li>
              <span className="font-medium text-gray-700">
                プロフィール情報
              </span>
              ：表示名・自己紹介文・推しタグ・SNSリンクなど、ユーザーが入力した情報
            </li>
            <li>
              <span className="font-medium text-gray-700">セッション情報</span>
              ：ログイン時のIPアドレス・ブラウザのUser-Agent（不正アクセス検知のため）
            </li>
            <li>
              <span className="font-medium text-gray-700">位置情報（GPS）</span>
              ：イベントへのチェックイン時に取得を求める場合があります。取得を拒否しても基本機能はご利用いただけます
            </li>
            <li>
              <span className="font-medium text-gray-700">
                行動ログ（匿名）
              </span>
              ：ページ閲覧・ボタン操作などの操作履歴（IPアドレスは含みません）
            </li>
          </ul>
        </Section>

        <Section title="3. 利用目的">
          <ul className="list-disc list-inside space-y-1">
            <li>アカウント認証・本人確認</li>
            <li>なふだ（プロフィール）の生成・表示・共有</li>
            <li>コネクション（つながり）機能の提供</li>
            <li>サービスの改善・不具合調査</li>
            <li>不正利用の検知・防止</li>
          </ul>
        </Section>

        <Section title="4. 第三者サービスへのデータ提供">
          <p>
            本サービスは以下の第三者サービスを利用しており、必要な範囲でデータが提供・処理されます。
            いずれも法令に基づく場合を除き、第三者への売却・目的外提供は行いません。
          </p>
          <div className="mt-3 space-y-3">
            <div>
              <p className="font-medium text-gray-700">PostHog（米国）</p>
              <p>
                匿名の行動ログを収集するアナリティクスサービスです。IPアドレスの収集を無効化しています。
                詳細:{" "}
                <a
                  href="https://posthog.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-pink-500 underline underline-offset-2"
                >
                  posthog.com/privacy
                </a>
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-700">Google（米国）</p>
              <p>
                Googleアカウントによるログイン機能を提供します。詳細:{" "}
                <a
                  href="https://policies.google.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-pink-500 underline underline-offset-2"
                >
                  policies.google.com/privacy
                </a>
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-700">
                Meta（Facebook）（米国）
              </p>
              <p>
                Facebookアカウントによるログイン機能を提供します。詳細:{" "}
                <a
                  href="https://www.facebook.com/privacy/policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-pink-500 underline underline-offset-2"
                >
                  facebook.com/privacy/policy
                </a>
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-700">Neon（米国）</p>
              <p>
                アカウント情報・プロフィール・コネクション履歴などを保管するデータベースサービスです。
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-700">Cloudflare（米国）</p>
              <p>サービスのホスティング・CDNを担います。</p>
            </div>
          </div>
        </Section>

        <Section title="5. Cookieおよびローカルストレージの利用">
          <p>
            本サービスはセッション管理のためにCookieを使用します（有効期間:
            最大30日）。
            PostHogの行動ログ収集にはlocalStorageおよびCookieを使用します。
            ブラウザの設定でCookieを無効化することができますが、ログイン機能が利用できなくなる場合があります。
          </p>
        </Section>

        <Section title="6. データの保管・セキュリティ">
          <p>
            収集したデータは米国のNeonデータベースに保管されます。
            通信はTLS（HTTPS）で暗号化し、セッショントークンは署名付きCookieで管理しています。
            ただし、インターネット上の通信において完全な安全性を保証することはできません。
          </p>
        </Section>

        <Section title="7. ユーザーの権利">
          <p>ユーザーはいつでも以下の操作を行えます。</p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>プロフィール情報の閲覧・編集・削除</li>
            <li>
              退会（アカウント削除）:
              アカウント・なふだ・コネクション履歴・SNSリンク・チェックイン履歴を即時・完全に削除します。これに伴い発行済みのURL（UrlId）も削除されるため、印刷・共有済みのQRコードは使用できなくなります。ただし、ご自身が作成したイベント（名称・会場名・開催日等）は他の参加者の記録として残ります
            </li>
          </ul>
          <p className="mt-2">
            退会手順: ログイン後、画面右上のメニュー →「アカウント」→「退会」からアカウントを削除できます。メールでの削除依頼も受け付けます（下記お問い合わせ先）。
          </p>
          <p className="mt-2">
            個人情報の開示・訂正・利用停止等のご請求は下記お問い合わせ先までご連絡ください。
          </p>
        </Section>

        <Section title="8. プライバシーポリシーの改定">
          <p>
            本ポリシーは必要に応じて改定することがあります。重要な変更がある場合はサービス内でお知らせします。
            変更後も引き続きご利用いただいた場合、改定後のポリシーに同意したものとみなします。
          </p>
        </Section>

        <Section title="9. お問い合わせ">
          <p>
            個人情報の取り扱いに関するご質問・ご要望は下記までお問い合わせください。
            <br />
            <a
              href="mailto:pitang1965@gmail.com"
              className="text-pink-500 underline underline-offset-2"
            >
              pitang1965@gmail.com
            </a>
          </p>
        </Section>
      </div>
    </main>
  );
}
