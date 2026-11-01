import { Link } from "react-router-dom";
import { UserRound, Mail, Phone, IdCard, MapPin } from "lucide-react";
import PageHeader from "../../components/public/PageHeader";
import { useMyProfile } from "../../hooks/useCustomer";

function ProfileField({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-4 border-b border-brand-border py-4 last:border-b-0">
      <div className="rounded-xl bg-brand-muted p-3 text-brand-primary">
        <Icon className="h-5 w-5" />
      </div>

      <div className="min-w-0">
        <p className="text-sm text-brand-muted-foreground">{label}</p>
        <p className="mt-1 break-words font-semibold text-brand-foreground">
          {value || "No registrado"}
        </p>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { profile, loading, error, refetch } = useMyProfile();

  return (
    <>
      <PageHeader title="Mi perfil">
        Consulta la información de tu cuenta.
      </PageHeader>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        {loading && (
          <p role="status" className="text-brand-muted-foreground">
            Cargando tu perfil...
          </p>
        )}

        {error && (
          <div
            role="alert"
            className="rounded-2xl border border-red-300 p-5 text-red-600"
          >
            <p>No pudimos cargar tu perfil: {error}</p>
            <button
              type="button"
              onClick={refetch}
              className="mt-3 font-semibold underline"
            >
              Reintentar
            </button>
          </div>
        )}

        {!loading && !error && profile && (
          <section className="overflow-hidden rounded-3xl border border-brand-border bg-brand-card">
            <div className="flex items-center gap-4 border-b border-brand-border p-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-primary text-brand-primary-foreground">
                <UserRound className="h-8 w-8" />
              </div>

              <div>
                <h1 className="text-xl font-bold text-brand-foreground">
                  {profile.nombre}
                </h1>
                <p className="text-sm text-brand-muted-foreground">
                  Cuenta de cliente
                </p>
              </div>
            </div>

            <div className="px-6">
              <ProfileField
                icon={UserRound}
                label="Nombre completo"
                value={profile.nombre}
              />
              <ProfileField
                icon={Mail}
                label="Correo electrónico"
                value={profile.correo}
              />
              <ProfileField
                icon={IdCard}
                label="Cédula"
                value={profile.cedula}
              />
              <ProfileField
                icon={Phone}
                label="Teléfono"
                value={profile.telefono}
              />
              <ProfileField
                icon={MapPin}
                label="Dirección"
                value={profile.direccion}
              />
            </div>

            <div className="flex flex-wrap gap-3 border-t border-brand-border p-6">
              <Link
                to="/mis-pedidos"
                className="rounded-xl bg-brand-primary px-5 py-3 text-sm font-semibold text-brand-primary-foreground"
              >
                Ver mis pedidos
              </Link>
              <Link
                to="/shop"
                className="rounded-xl border border-brand-border px-5 py-3 text-sm font-semibold text-brand-foreground"
              >
                Ir al catálogo
              </Link>
            </div>
          </section>
        )}
      </main>
    </>
  );
}
