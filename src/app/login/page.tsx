import { AuthForm } from "@/components/AuthForm";

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Log in</h1>
      <AuthForm mode="login" />
    </div>
  );
}
