import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { auth } from "../server/auth";
import { HeroVideo } from "../components/HeroVideo";
import { useT } from "../lib/i18n/context";
import { LanguageToggle } from "../components/LanguageToggle";

const getSession = createServerFn({ method: "GET" }).handler(async () => {
  const request = getRequest();
  return auth.api.getSession({ headers: request.headers });
});

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const session = await getSession();
    if (session) {
      throw redirect({ to: "/me" });
    }
  },
  component: LandingPage,
});

function LandingPage() {
  const t = useT();

  const features = [
    {
      icon: "🔗",
      title: t("landing.feature1Title"),
      description: t("landing.feature1Description"),
    },
    {
      icon: "🪪",
      title: t("landing.feature2Title"),
      description: t("landing.feature2Description"),
    },
    {
      icon: "🗂",
      title: t("landing.feature3Title"),
      description: t("landing.feature3Description"),
    },
    {
      icon: "🪄",
      title: t("landing.feature4Title"),
      description: t("landing.feature4Description"),
    },
  ];

  return (
    <main className="min-h-screen bg-linear-to-b from-pink-50 to-white flex flex-col items-center px-4 py-12">
      <div className="max-w-md w-full flex flex-col items-center">
        <LanguageToggle className="fixed top-4 right-4" />
        <p className="text-2xl font-bold text-pink-500 tracking-widest mb-3">
          {t("common.brandName")}
        </p>
        <h1 className="text-3xl font-bold text-gray-800 mb-4 text-center leading-snug">
          {t("landing.heroTitle")}
        </h1>
        <p className="text-sm text-gray-600 mb-10 text-center leading-relaxed">
          {t("landing.heroSubtitle")}
        </p>

        <Link
          to="/login"
          className="w-full py-3 bg-pink-500 hover:bg-pink-600 text-white font-semibold rounded-full shadow-md transition-colors mb-12 text-base text-center block"
        >
          {t("landing.cta")}
        </Link>

        <p className="text-xs text-gray-500 text-center">
          <Link
            to="/terms"
            className="underline underline-offset-2 hover:text-gray-700"
          >
            {t("login.terms")}
          </Link>
          ・
          <Link
            to="/privacy"
            className="underline underline-offset-2 hover:text-gray-700"
          >
            {t("login.privacy")}
          </Link>
        </p>

        {/* Screenshots */}
        <div className="flex flex-col gap-10 w-full mt-10 mb-2">
          <div className="flex flex-col items-center gap-3">
            <HeroVideo />
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-800">
                {t("landing.makeYourOwn")}
              </p>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                {t("landing.makeYourOwnDescription")}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center gap-3">
            <a
              href="https://nafuda.me/u/ffa2c0f0f4/p/5db65a7ecc006a102f7ba42790acff93"
              target="_blank"
              rel="noopener noreferrer"
              className="relative block"
            >
              <img
                src="/demo-qrl.png"
                alt={t("landing.qrAlt")}
                width={300}
                height={349}
                loading="lazy"
                className="w-48 h-48 rounded-2xl shadow-lg"
              />
              <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-pink-500 px-3 py-1 text-xs font-semibold text-white shadow-md">
                {t("landing.tapToOpen")}
              </span>
            </a>
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-800 mt-2">
                {t("landing.tryOpening")}
              </p>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                {t("landing.tryOpeningDescription")}
              </p>
            </div>
          </div>
        </div>

        <p className="text-sm font-bold text-gray-700 tracking-wider mb-4 self-start mt-8">
          {t("landing.whatYouCanDo")}
        </p>
        <div className="flex flex-col gap-4 w-full">
          {features.map((f) => (
            <div
              key={f.title}
              className="flex items-start gap-4 bg-white rounded-2xl shadow-sm px-5 py-4"
            >
              <span className="text-3xl mt-0.5">{f.icon}</span>
              <div>
                <p className="font-semibold text-gray-800 text-sm">{f.title}</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                  {f.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
