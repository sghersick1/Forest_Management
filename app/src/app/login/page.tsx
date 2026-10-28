import { Roboto } from "next/font/google";
import { SignInForm } from "./sign-in-form";

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "500"],
});

export default function LoginPage() {
  return (
    <main
      className={`${roboto.className} flex min-h-svh flex-col bg-white px-8 py-16 text-black`}
    >
      <div className="mx-auto flex w-full max-w-sm flex-col gap-8">
        <h1 className="text-[28px] leading-9 font-normal">Sign in</h1>
        <SignInForm />
      </div>
    </main>
  );
}
