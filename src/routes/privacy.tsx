import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { useT, useLocale } from "../lib/i18n/context";
import { LanguageToggle } from "../components/LanguageToggle";

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
  const t = useT();
  const { locale } = useLocale();

  return (
    <main className="min-h-screen bg-gray-50 flex justify-center px-4 py-10">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-sm px-6 py-8">
        <div className="mb-8 flex items-start justify-between gap-3">
          <div>
            <Link
              to="/"
              className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
            >
              <ChevronLeft className="size-4" />
              {t("common.backToTop")}
            </Link>
            <h1 className="text-xl font-bold text-gray-900 mt-4">
              {locale === "en" ? "Privacy Policy" : "プライバシーポリシー"}
            </h1>
            <p className="text-xs text-gray-400 mt-1">
              {locale === "en"
                ? "Last updated: September 28, 2026"
                : "最終更新: 2026年9月28日"}
            </p>
          </div>
          <LanguageToggle className="shrink-0" />
        </div>

        {locale === "en" ? <PrivacyContentEn /> : <PrivacyContentJa />}
      </div>
    </main>
  );
}

function PrivacyContentJa() {
  return (
    <>
      <Section title="1. 運営者">
        <p>
          屋号・名称: ピータン
          <br />
          お問い合わせ:{" "}
          <a
            href="mailto:info@nafuda.me"
            className="text-pink-500 underline underline-offset-2"
          >
            info@nafuda.me
          </a>
        </p>
        <p>
          本サービス「なふだ」（以下「本サービス」）の利用条件は
          <Link
            to="/terms"
            className="text-pink-500 underline underline-offset-2"
          >
            利用規約
          </Link>
          に定めています。
        </p>
      </Section>

      <Section title="2. 収集する情報">
        <p>本サービスでは以下の情報を収集します。</p>
        <ul className="list-disc list-inside space-y-1 mt-2">
          <li>
            <span className="font-medium text-gray-700">アカウント情報</span>
            ：Google・Facebook・LINEでのログイン時に取得する氏名・メールアドレス・プロフィール画像
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
          <li>
            <span className="font-medium text-gray-700">
              エラー・不具合の記録
            </span>
            ：サービス側で不具合が発生した際の技術情報（発生した処理のスタックトレース、リクエストのURLパス、発生日時など。エラー監視ツールSentryを利用）。
            <span className="font-medium text-gray-700">
              氏名・メールアドレス等の個人情報や入力欄の内容は含みません
            </span>
          </li>
        </ul>
        <p className="mt-3">
          アカウント情報は退会まで保管し、退会時に削除します。
        </p>
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
            <p className="font-medium text-gray-700">
              LINEヤフー株式会社（日本）
            </p>
            <p>
              LINEアカウントによるログイン機能を提供します。ログイン時に氏名・メールアドレス・プロフィール画像を取得し、アカウント認証・本人確認の目的で利用します。詳細:{" "}
              <a
                href="https://line.me/ja/terms/policy/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-pink-500 underline underline-offset-2"
              >
                line.me/ja/terms/policy/
              </a>
            </p>
          </div>
          <div>
            <p className="font-medium text-gray-700">Cloudflare（米国）</p>
            <p>
              サービスのホスティング・CDNに加え、アカウント情報・プロフィール・コネクション履歴などを保管するデータベース（D1、アジア太平洋リージョン）を担います。
            </p>
          </div>
          <div>
            <p className="font-medium text-gray-700">Sentry（ドイツ/EU）</p>
            <p>
              サービス側で不具合が発生した際のエラー監視を担います。スタックトレース・発生箇所・リクエストのURLパスなど技術情報のみを扱い、氏名・メールアドレス等の個人情報は送信しない設定です。詳細:{" "}
              <a
                href="https://sentry.io/privacy/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-pink-500 underline underline-offset-2"
              >
                sentry.io/privacy
              </a>
            </p>
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
          収集したデータはCloudflare D1データベース（アジア太平洋リージョン）に保管されます。
          以前使用していたNeonデータベース（米国）に保持していた移行時のロールバック用バックアップは削除済みです。
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
          LINEログイン連携の解除をご希望の場合は、退会によりアカウントごと削除されます。
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
            href="mailto:info@nafuda.me"
            className="text-pink-500 underline underline-offset-2"
          >
            info@nafuda.me
          </a>
        </p>
      </Section>
    </>
  );
}

function PrivacyContentEn() {
  return (
    <>
      <Section title="1. Operator">
        <p>
          Operator: Pitang
          <br />
          Contact:{" "}
          <a
            href="mailto:info@nafuda.me"
            className="text-pink-500 underline underline-offset-2"
          >
            info@nafuda.me
          </a>
        </p>
        <p>
          The terms of use for "Nafuda" (the "Service") are set out in our{" "}
          <Link
            to="/terms"
            className="text-pink-500 underline underline-offset-2"
          >
            Terms of Service
          </Link>
          .
        </p>
      </Section>

      <Section title="2. Information We Collect">
        <p>The Service collects the following information:</p>
        <ul className="list-disc list-inside space-y-1 mt-2">
          <li>
            <span className="font-medium text-gray-700">
              Account information
            </span>
            : Name, email address, and profile picture provided by Google,
            Facebook, or LINE when you sign in
          </li>
          <li>
            <span className="font-medium text-gray-700">
              Profile information
            </span>
            : Display name, bio, oshi tags, SNS links, and other information
            entered by the user
          </li>
          <li>
            <span className="font-medium text-gray-700">
              Session information
            </span>
            : IP address and browser user agent at login (for detecting
            unauthorized access)
          </li>
          <li>
            <span className="font-medium text-gray-700">
              Location data (GPS)
            </span>
            : May be requested when checking in to an event. Core features
            remain available even if you decline
          </li>
          <li>
            <span className="font-medium text-gray-700">
              Usage logs (anonymous)
            </span>
            : Page views, button interactions, and similar activity (does not
            include IP addresses)
          </li>
          <li>
            <span className="font-medium text-gray-700">
              Error and bug records
            </span>
            : Technical information generated when an error occurs in the
            Service, such as the stack trace of the affected process, the
            request URL path, and the timestamp. This information is
            collected using Sentry, an error-monitoring service.{" "}
            <span className="font-medium text-gray-700">
              Does not include personal information such as name or email
              address, or the contents of input fields
            </span>
          </li>
        </ul>
        <p className="mt-3">
          Account information is retained until account deletion, at which
          point it is deleted.
        </p>
      </Section>

      <Section title="3. Purpose of Use">
        <ul className="list-disc list-inside space-y-1">
          <li>Account authentication and identity verification</li>
          <li>Creating, displaying, and sharing Nafuda (profiles)</li>
          <li>Providing the Connections feature</li>
          <li>Improving the Service and investigating malfunctions</li>
          <li>Detecting and preventing fraudulent use</li>
        </ul>
      </Section>

      <Section title="4. Data Shared with Third-Party Services">
        <p>
          The Service uses the following third-party services, which provide
          and process data to the extent necessary. Except where required by
          law, data is not sold to third parties or used for purposes beyond
          those described below.
        </p>
        <div className="mt-3 space-y-3">
          <div>
            <p className="font-medium text-gray-700">PostHog (United States)</p>
            <p>
              An analytics service that collects anonymous usage logs. IP
              address collection is disabled. Details:{" "}
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
            <p className="font-medium text-gray-700">Google (United States)</p>
            <p>
              Provides login via Google account. Details:{" "}
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
              Meta (Facebook) (United States)
            </p>
            <p>
              Provides login via Facebook account. Details:{" "}
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
            <p className="font-medium text-gray-700">LY Corporation (Japan)</p>
            <p>
              Provides login via LINE account. At login, we obtain your name,
              email address, and profile picture, used for account
              authentication and identity verification. Details:{" "}
              <a
                href="https://line.me/ja/terms/policy/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-pink-500 underline underline-offset-2"
              >
                line.me/ja/terms/policy/
              </a>
            </p>
          </div>
          <div>
            <p className="font-medium text-gray-700">
              Cloudflare (United States)
            </p>
            <p>
              Provides hosting and CDN for the Service, as well as the
              database (D1, Asia-Pacific region) that stores account
              information, profiles, connection history, and similar data.
            </p>
          </div>
          <div>
            <p className="font-medium text-gray-700">Sentry (Germany/EU)</p>
            <p>
              Provides error monitoring when an error occurs in the Service.
              Only technical information such as stack traces, the location
              of the error, and request URL paths is handled; it is
              configured not to send personal information such as name or
              email address. Details:{" "}
              <a
                href="https://sentry.io/privacy/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-pink-500 underline underline-offset-2"
              >
                sentry.io/privacy
              </a>
            </p>
          </div>
        </div>
      </Section>

      <Section title="5. Use of Cookies and Local Storage">
        <p>
          The Service uses cookies for session management (valid for up to 30
          days). PostHog's usage-log collection uses localStorage and
          cookies. You can disable cookies in your browser settings, but
          doing so may prevent the login feature from working.
        </p>
      </Section>

      <Section title="6. Data Storage and Security">
        <p>
          Collected data is stored in a Cloudflare D1 database (Asia-Pacific
          region). The rollback backup previously held in the Neon database
          (United States) used during migration has been deleted.
          Communications are encrypted via TLS (HTTPS), and session tokens
          are managed using signed cookies. However, we cannot guarantee
          complete security for communications over the internet.
        </p>
      </Section>

      <Section title="7. User Rights">
        <p>Users may do the following at any time:</p>
        <ul className="list-disc list-inside space-y-1 mt-2">
          <li>View, edit, or delete profile information</li>
          <li>
            Delete account: Immediately and completely deletes your account,
            Nafuda, connection history, SNS links, and check-in history. Your
            issued URL (UrlId) will also be deleted, so any printed or shared
            QR codes containing that URL will no longer work. However, events
            you created (name, venue, date, etc.) remain as a record for
            other participants
          </li>
        </ul>
        <p className="mt-2">
          How to delete your account: After logging in, go to the menu in the
          top right → "Account" → "Delete Account." We also accept deletion
          requests by email (see contact details below).
        </p>
        <p className="mt-2">
          We don't offer a way to unlink your LINE account on its own —
          deleting your account will remove the LINE connection along with
          everything else.
        </p>
        <p className="mt-2">
          For requests to disclose, correct, or stop using your personal
          information, please contact us at the address below.
        </p>
      </Section>

      <Section title="8. Changes to This Privacy Policy">
        <p>
          We may update this Privacy Policy from time to time. We will
          notify you within the Service of any material changes. Continued
          use of the Service after a change constitutes agreement to the
          revised Policy.
        </p>
      </Section>

      <Section title="9. Contact">
        <p>
          If you have any questions or requests regarding the handling of
          personal information, please contact us at the address below.
          <br />
          <a
            href="mailto:info@nafuda.me"
            className="text-pink-500 underline underline-offset-2"
          >
            info@nafuda.me
          </a>
        </p>
      </Section>
    </>
  );
}
