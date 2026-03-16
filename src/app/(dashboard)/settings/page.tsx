import SettingsClient from "@/components/settings/SettingsClient";

export default function SettingsPage() {
  return (
    <div className="h-full flex flex-col animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Paramètres</h1>
        <p className="text-text-muted mt-1">Gérez votre compte et vos préférences</p>
      </div>
      <div className="flex-1 min-h-0">
        <SettingsClient />
      </div>
    </div>
  );
}
