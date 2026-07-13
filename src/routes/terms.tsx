import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";

export const Route = createFileRoute("/terms")({
  component: TermsPage,
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

function TermsPage() {
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
          <h1 className="text-xl font-bold text-gray-900 mt-4">利用規約</h1>
          <p className="text-xs text-gray-400 mt-1">制定: 2026年7月13日</p>
        </div>

        <Section title="第1条（適用）">
          <p>
            本規約は、ピータン（以下「運営者」）が提供するサービス「なふだ」（以下「本サービス」）の利用条件を定めるものです。
            ユーザーは、本サービスにログインまたは本サービスを利用することにより、本規約および
            <Link
              to="/privacy"
              className="text-pink-500 underline underline-offset-2"
            >
              プライバシーポリシー
            </Link>
            に同意したものとみなします。
          </p>
        </Section>

        <Section title="第2条（利用資格）">
          <p>
            本サービスは13歳以上の方を対象としています。13歳未満の方はご利用いただけません。
          </p>
        </Section>

        <Section title="第3条（アカウント）">
          <p>
            ユーザーは、自己の責任においてアカウントを管理するものとします。
            第三者によるアカウントの不正利用により生じた損害について、運営者は責任を負いません。
          </p>
          <p>
            ユーザーはいつでも退会できます。退会時のデータの取り扱いは
            <Link
              to="/privacy"
              className="text-pink-500 underline underline-offset-2"
            >
              プライバシーポリシー
            </Link>
            に定めるとおりです。
          </p>
        </Section>

        <Section title="第4条（コンテンツの権利）">
          <p>
            ユーザーが本サービスに投稿・入力したプロフィール・画像・文章等（以下「ユーザーコンテンツ」）の著作権は、ユーザーに帰属します。
          </p>
          <p>
            ユーザーは運営者に対し、本サービスの提供・維持・改善に必要な範囲で、ユーザーコンテンツを複製・表示・送信することを無償で許諾するものとします。
            運営者はこの範囲を超えて、ユーザーコンテンツを宣伝等の目的で利用することはありません。
          </p>
        </Section>

        <Section title="第5条（禁止事項）">
          <p>ユーザーは、本サービスの利用にあたり、以下の行為をしてはなりません。</p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>法令または公序良俗に違反する行為</li>
            <li>他者（実在の人物・団体）と誤認させる行為</li>
            <li>
              他者の知的財産権・肖像権・プライバシーその他の権利を侵害する行為
            </li>
            <li>他者の個人情報を本人の同意なく収集・公開する行為</li>
            <li>
              スパム、無差別な勧誘など、社会通念上迷惑と判断される行為（招待機能・QRコードの濫用を含む）
            </li>
            <li>
              不正アクセス、過度な負荷をかける行為、その他本サービスの運営を妨害する行為
            </li>
            <li>その他、運営者が不適切と判断する行為</li>
          </ul>
        </Section>

        <Section title="第6条（違反への対応）">
          <p>
            ユーザーが本規約に違反した場合またはそのおそれがあると運営者が判断した場合、運営者は事前の通知なく、ユーザーコンテンツの削除、本サービスの利用停止、アカウントの削除を行うことができます。
            運営者は、これらの措置の理由を開示する義務を負いません。
          </p>
          <p>
            アカウントの削除に伴うデータの取り扱いは退会時と同様であり、削除されたデータおよび発行済みのURLは復元できません。
          </p>
        </Section>

        <Section title="第7条（サービスの変更・終了）">
          <p>
            運営者は、事前の予告なく本サービスの内容の変更・機能の追加や廃止・一時的な中断を行うことができます。
          </p>
          <p>
            本サービス全体を終了する場合は、30日前までに本サービス内で告知します。ただし、法令への対応、システム上の重大な障害その他やむを得ない事情がある場合はこの限りではありません。
          </p>
        </Section>

        <Section title="第8条（料金）">
          <p>
            本サービスは現在無料で提供しています。将来、有料の機能を導入する場合は、内容と条件を別途定め、事前に告知します。
          </p>
        </Section>

        <Section title="第9条（免責）">
          <p>
            本サービスは現状有姿で提供され、運営者はその完全性・正確性・有用性・特定目的への適合性を保証しません。
          </p>
          <p>
            運営者は、本サービスの中断・停止・終了、データの消失、不具合等によりユーザーに生じた損害について、運営者に故意または重大な過失がある場合を除き、責任を負いません。
            運営者が責任を負う場合であっても、その範囲は現実に生じた直接かつ通常の損害に限られます。
          </p>
          <p>
            ユーザー間またはユーザーと第三者との間で生じたトラブルについて、運営者は関与せず、責任を負いません。
          </p>
        </Section>

        <Section title="第10条（反社会的勢力の排除）">
          <p>
            ユーザーは、自らが暴力団、暴力団員その他の反社会的勢力に該当しないこと、および反社会的勢力と関係を有しないことを表明し、保証するものとします。
          </p>
        </Section>

        <Section title="第11条（規約の改定）">
          <p>
            運営者は、必要に応じて本規約を改定することがあります。改定する場合は、効力発生日を定め、本サービス内で周知します。
            効力発生日以降に本サービスを利用した場合、改定後の規約に同意したものとみなします。
          </p>
        </Section>

        <Section title="第12条（分離可能性）">
          <p>
            本規約のいずれかの条項が無効または執行不能と判断された場合であっても、その他の条項は継続して完全に効力を有するものとします。
          </p>
        </Section>

        <Section title="第13条（準拠法・管轄）">
          <p>
            本規約の準拠法は日本法とします。本サービスに関して紛争が生じた場合、運営者の所在地を管轄する裁判所を第一審の専属的合意管轄裁判所とします。
          </p>
        </Section>

        <Section title="お問い合わせ">
          <p>
            本規約に関するご質問は下記までお問い合わせください。
            <br />
            <a
              href="mailto:info@nafuda.me"
              className="text-pink-500 underline underline-offset-2"
            >
              info@nafuda.me
            </a>
          </p>
        </Section>
      </div>
    </main>
  );
}
