import { Link, useSearchParams } from "react-router-dom";
import {
  UserRound,
  Mail,
  Phone,
  IdCard,
  MapPin,
  Package,
  ShieldCheck,
  Headset,
  ChevronLeft,
} from "lucide-react";
import { useMyProfile } from "../../hooks/useCustomer";
import MyOrdersContent from "../../components/public/MyOrdersContent";

const CARDS = [
  {
    id: "pedidos",
    icon: Package,
    title: "Tus pedidos",
    description: "Consulta el historial, el estado y el detalle de tus compras.",
  },
  {
    id: "datos",
    icon: ShieldCheck,
    title: "Tus datos",
    description: "Revisa tu nombre, correo, cédula y teléfono registrados.",
  },
  {
    id: "direccion",
    icon: MapPin,
    title: "Tu dirección",
    description: "Consulta la dirección asociada a tu cuenta.",
  },
  {
    id: "ayuda",
    icon: Headset,
    title: "Servicio al cliente",
    description: "Contáctanos o explora el catálogo de productos.",
  },
];

const SECTION_TITLES = {
  pedidos: "Tus pedidos",
  datos: "Tus datos",
  direccion: "Tu dirección",
  ayuda: "Servicio al cliente",
};

function HubCard({ icon: Icon, title, description, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-start gap-4 rounded-xl border border-brand-border bg-brand-card p-5 text-left transition-colors hover:bg-brand-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-primary"
    >
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-accent text-brand-primary">
        <Icon className="h-7 w-7" />
      </span>
      <span className="min-w-0">
        <span className="block text-lg font-semibold text-brand-foreground">
          {title}
        </span>
        <span className="mt-1 block text-sm text-brand-muted-foreground">
          {description}
        </span>
      </span>
    </button>
  );
}

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

function ProfileStatus({ loading, error, refetch, children }) {
  if (loading) {
    return (
      <p role="status" className="text-brand-muted-foreground">
        Cargando tu perfil...
      </p>
    );
  }
  if (error) {
    return (
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
    );
  }
  return children;
}

function DatosSection({ profile }) {
  return (
    <div className="rounded-xl border border-brand-border bg-brand-card px-6">
      <ProfileField icon={UserRound} label="Nombre completo" value={profile?.nombre} />
      <ProfileField icon={Mail} label="Correo electrónico" value={profile?.correo} />
      <ProfileField icon={IdCard} label="Cédula" value={profile?.cedula} />
      <ProfileField icon={Phone} label="Teléfono" value={profile?.telefono} />
    </div>
  );
}

function DireccionSection({ profile }) {
  return (
    <div className="rounded-xl border border-brand-border bg-brand-card px-6">
      <ProfileField icon={MapPin} label="Dirección" value={profile?.direccion} />
    </div>
  );
}

function AyudaSection() {
  return (
    <div className="rounded-xl border border-brand-border bg-brand-card p-6">
      <p className="text-brand-muted-foreground">
        ¿Necesitas ayuda con un pedido o con tu cuenta? Visítanos en la sucursal
        de retiro o explora nuestro catálogo.
      </p>
      <Link
        to="/shop"
        className="mt-4 inline-block rounded-xl bg-brand-primary px-5 py-3 text-sm font-semibold text-brand-primary-foreground"
      >
        Ir al catálogo
      </Link>
    </div>
  );
}

export default function ProfilePage() {
  const { profile, loading, error, refetch } = useMyProfile();
  const [params, setParams] = useSearchParams();

  const seccion = params.get("seccion");
  const activa = SECTION_TITLES[seccion] ? seccion : null;

  const abrir = (id) => setParams({ seccion: id });
  const volver = () => setParams({});

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      {!activa ? (
        <>
          <h1 className="mb-2 text-3xl font-bold text-brand-foreground">
            Tu cuenta
          </h1>
          {profile?.nombre && (
            <p className="mb-6 text-brand-muted-foreground">
              Hola, {profile.nombre}
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CARDS.map((card) => (
              <HubCard key={card.id} {...card} onClick={() => abrir(card.id)} />
            ))}
          </div>
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={volver}
            className="mb-4 flex items-center gap-1 text-sm font-semibold text-brand-primary hover:underline"
          >
            <ChevronLeft className="h-4 w-4" />
            Tu cuenta
          </button>

          <h1 className="mb-6 text-3xl font-bold text-brand-foreground">
            {SECTION_TITLES[activa]}
          </h1>

          {activa === "pedidos" && <MyOrdersContent />}

          {activa === "datos" && (
            <ProfileStatus loading={loading} error={error} refetch={refetch}>
              <DatosSection profile={profile} />
            </ProfileStatus>
          )}

          {activa === "direccion" && (
            <ProfileStatus loading={loading} error={error} refetch={refetch}>
              <DireccionSection profile={profile} />
            </ProfileStatus>
          )}

          {activa === "ayuda" && <AyudaSection />}
        </>
      )}
    </main>
  );
}