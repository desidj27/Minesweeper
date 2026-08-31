import { AuthForm } from "@/components/AuthForm";

export default function RegisterPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Create account</h1>
      <AuthForm mode="register" />
    </div>
  );
}
