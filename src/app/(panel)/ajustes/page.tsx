import { EstadoVacio } from "@/components/EstadoVacio";
import { Pestanas } from "@/components/Pestanas";
import { SelectorCorte } from "@/components/SelectorCorte";
import { TablaZonas, type ColumnaTabla } from "@/components/TablaZonas";
import { TarjetaKpi } from "@/components/TarjetaKpi";
import { GraficoComposicion } from "@/components/graficos/GraficoComposicion";
import type { FilaAjustes } from "@/lib/calculos";
import { cargarAjustes, listarCortes, resolverCorte } from "@/lib/consultas";
import { ETIQUETA_TIPOLOGIA, TIPOLOGIAS } from "@/lib/dominio";
import { prisma } from "@/lib/db";
import { moneda, numero, porcentaje } from "@/lib/formato";

type Resumen = Omit<FilaAjustes, "tiendaId" | "tienda">;

export default async function AjustesPage({ searchParams }: PageProps<"/ajustes">) {
  const parametros = await searchParams;
  const corteId = typeof parametros.corte === "string" ? parametros.corte : undefined;
  const modo = parametros.modo === "monto" ? "monto" : "porcentaje";

  const [cortes, corte] = await Promise.all([listarCortes(), resolverCorte(corteId)]);
  if (!corte) return <EstadoVacio mensaje="No hay cortes cargados todavía." />;

  const [ajustes, referencias, porCategoria, unidadesDeLaZona] = await Promise.all([
    cargarAjustes(corte.id),
    prisma.ajusteReferencia.findMany({ where: { corteId: corte.id } }),
    prisma.registroAjusteCategoria.findMany({
      where: { corteId: corte.id },
      include: {
        categoria: { select: { nombre: true } },
        tienda: { select: { nombre: true, zona: { select: { detallada: true } } } },
      },
    }),
    prisma.registroAjuste.aggregate({
      _sum: { unidades: true },
      where: { corteId: corte.id, tienda: { zona: { detallada: true } } },
    }),
  ]);

  // Ocho tipologías en columnas vacías no dicen nada: se muestran las que tienen dato en el
  // corte, y las cinco de siempre si todavía no hay ninguna.
  const conDato = TIPOLOGIAS.filter((tipologia) => ajustes.total.montos[tipologia] !== null);
  const tipologias = conDato.length ? conDato : TIPOLOGIAS.slice(0, 5);

  const cadena = referencias.find(
    (referencia) => referencia.ambito === "CADENA" && referencia.tipologia === "TOTAL",
  );
  // Primero el centro que abastece a la zona: es el que suma a su costo.
  const centros = referencias
    .filter((referencia) => referencia.ambito === "CENTRO_DISTRIBUCION")
    .sort((a, b) => Number(Boolean(b.zonaId)) - Number(Boolean(a.zonaId)));
  // Una zona sin ningún ajuste cargado son filas de guiones: se omite, y el total deja de
  // llamarse "de la cadena" porque ya no lo es. La cadena, si llegó, va en su tarjeta.
  const zonasConDato = ajustes.zonas.filter((zona) => zona.subtotal.totalMonto !== null);
  const zonasVisibles = zonasConDato.length ? zonasConDato : ajustes.zonas;
  const etiquetaTotal =
    zonasVisibles.length < ajustes.zonas.length ? "Total de lo cargado" : "Total cadena";
  const unidadesZona = unidadesDeLaZona._sum.unidades;

  const columnas: ColumnaTabla<FilaAjustes, Resumen>[] = [
    ...tipologias.map((tipologia) => ({
      titulo: ETIQUETA_TIPOLOGIA[tipologia],
      numerica: true,
      celda: (fila: FilaAjustes) =>
        modo === "monto"
          ? moneda(fila.montos[tipologia])
          : porcentaje(fila.porcentajes[tipologia], 2),
      resumen: (resumen: Resumen) =>
        modo === "monto"
          ? moneda(resumen.montos[tipologia])
          : porcentaje(resumen.porcentajes[tipologia], 2),
    })),
    {
      titulo: "Total",
      numerica: true,
      celda: (fila) =>
        modo === "monto" ? moneda(fila.totalMonto) : porcentaje(fila.totalPorcentaje, 2),
      resumen: (resumen) =>
        modo === "monto" ? moneda(resumen.totalMonto) : porcentaje(resumen.totalPorcentaje, 2),
    },
  ];

  // Los ajustes vienen en negativo por ser en contra, así que el de mayor impacto es el de
  // mayor magnitud: ordenar por el número con signo coronaba a la única tipología a favor.
  const mayor = tipologias.map((tipologia) => ({
    tipologia,
    monto: ajustes.total.montos[tipologia] ?? 0,
  })).sort((a, b) => Math.abs(b.monto) - Math.abs(a.monto))[0];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl">Ajustes por Tipología</h1>
          <p className="mt-1 max-w-2xl text-sm text-texto-2">
            Dónde se está perdiendo dinero en {corte.nombre} y de qué forma. El % sobre ventas es
            lo que hace comparable una tienda grande con una pequeña.
          </p>
        </div>
        <SelectorCorte cortes={cortes} actual={corte.id} />
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <TarjetaKpi
          etiqueta="Ajustes totales"
          valor={moneda(ajustes.total.totalMonto)}
          detalle={`${porcentaje(ajustes.total.totalPorcentaje, 2)} de las ventas`}
        />
        <TarjetaKpi
          etiqueta="Tipología de mayor impacto"
          valor={ETIQUETA_TIPOLOGIA[mayor.tipologia]}
          detalle={moneda(mayor.monto)}
        />
        <TarjetaKpi
          etiqueta="Ventas del corte"
          valor={moneda(ajustes.total.ventasReal)}
          detalle="Base de todos los porcentajes"
        />
        {cadena?.monto != null && cadena.ventas ? (
          <TarjetaKpi
            etiqueta="Toda la cadena"
            valor={porcentaje((cadena.monto / cadena.ventas) * 100, 2)}
            detalle={`${moneda(cadena.monto)} sobre ${moneda(cadena.ventas)} de venta`}
          />
        ) : null}
        {centros.map((centro) => (
          <TarjetaKpi
            key={centro.id}
            etiqueta={`Centro de distribución · ${centro.nombre}`}
            valor={`${numero(centro.unidades)} unid.`}
            detalle={
              centro.zonaId && unidadesZona
                ? `Abastece a la zona; sus tiendas ajustaron ${numero(unidadesZona)} unid. en total`
                : "Ajusta inventario sin vender: no entra en el % sobre ventas"
            }
          />
        ))}
      </section>

      <section className="tarjeta p-4">
        <h2 className="mb-3 text-sm font-semibold">En qué se va el ajuste</h2>
        <GraficoComposicion
          porciones={tipologias.map((tipologia) => ({
            etiqueta: ETIQUETA_TIPOLOGIA[tipologia],
            valor: ajustes.total.montos[tipologia] ?? 0,
          }))}
        />
      </section>

      <Pestanas
        pestanas={[
          { clave: "porcentaje", etiqueta: "% sobre ventas" },
          { clave: "monto", etiqueta: "Monto en $" },
        ].map((opcion) => ({
          href: `/ajustes?corte=${corte.id}&modo=${opcion.clave}`,
          etiqueta: opcion.etiqueta,
          activa: modo === opcion.clave,
        }))}
      />

      <TablaZonas
        zonas={zonasVisibles}
        total={ajustes.total}
        columnas={columnas}
        etiquetaTotal={etiquetaTotal}
      />

      <AjustePorCategoria registros={porCategoria} />
    </div>
  );
}

type RegistroCategoria = {
  tiendaId: string | null;
  ventas: number | null;
  monto: number | null;
  categoria: { nombre: string };
  tienda: { nombre: string; zona: { detallada: boolean } } | null;
};

const sobre = (parte: number, base: number) => (base ? (parte / base) * 100 : null);

/**
 * Dónde se pierde el dinero: el ajuste de cada categoría contra su propia venta, en la zona y
 * en la cadena, y las tres categorías que más pesan abiertas por tienda. Es lo que convierte
 * "la merma está alta" en "productos del campo en Valle de la Pascua".
 */
function AjustePorCategoria({ registros }: { registros: RegistroCategoria[] }) {
  const deZona = registros.filter((registro) => registro.tienda?.zona.detallada);
  if (!deZona.length) return null;

  const agrupar = (lista: RegistroCategoria[]) => {
    const mapa = new Map<string, { ventas: number; monto: number }>();
    for (const registro of lista) {
      const actual = mapa.get(registro.categoria.nombre) ?? { ventas: 0, monto: 0 };
      actual.ventas += registro.ventas ?? 0;
      actual.monto += registro.monto ?? 0;
      mapa.set(registro.categoria.nombre, actual);
    }
    return mapa;
  };
  const zona = agrupar(deZona);
  const cadena = agrupar(registros.filter((registro) => registro.tiendaId === null));
  // Magnitudes, no montos con signo: una categoría con ajuste a favor también pesa, y el peso
  // de cada una se mide contra la suma de magnitudes para que no pase del 100 %.
  const totalZona = [...zona.values()].reduce((total, fila) => total + Math.abs(fila.monto), 0);
  const filas = [...zona]
    .filter(([, valores]) => valores.monto)
    .sort((a, b) => Math.abs(b[1].monto) - Math.abs(a[1].monto));
  const principales = filas.slice(0, 3).map(([nombre]) => nombre);
  const tiendas = [...new Set(deZona.map((registro) => registro.tienda!.nombre))];
  const celda = (tienda: string, categoria: string) => {
    const registro = deZona.find(
      (fila) => fila.tienda!.nombre === tienda && fila.categoria.nombre === categoria,
    );
    return registro ? sobre(registro.monto ?? 0, registro.ventas ?? 0) : null;
  };

  return (
    <section className="space-y-4">
      <div className="tarjeta overflow-x-auto">
        <div className="px-5 pt-5 pb-3">
          <h2 className="text-base font-semibold tracking-[-0.02em]">Ajuste por categoría</h2>
          <p className="mt-1 text-sm text-texto-3">
            Dólares ajustados contra la venta de la propia categoría.
          </p>
        </div>
        <table className="tabla min-w-[560px]">
          <thead>
            <tr>
              <th className="text-left">Categoría</th>
              <th>Ajuste · zona</th>
              <th>Peso</th>
              <th>% de su venta</th>
              <th>Cadena</th>
            </tr>
          </thead>
          <tbody>
            {filas.map(([nombre, valores]) => {
              const deCadena = cadena.get(nombre);
              return (
                <tr key={nombre}>
                  <td className="text-left">{nombre}</td>
                  <td>{moneda(valores.monto)}</td>
                  <td className="text-texto-2">{porcentaje(sobre(Math.abs(valores.monto), totalZona))}</td>
                  <td className="font-medium">{porcentaje(sobre(valores.monto, valores.ventas), 2)}</td>
                  <td className="text-texto-2">
                    {deCadena ? porcentaje(sobre(deCadena.monto, deCadena.ventas), 2) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="tarjeta overflow-x-auto">
        <div className="px-5 pt-5 pb-3">
          <h2 className="text-base font-semibold tracking-[-0.02em]">
            Las que más pesan, por tienda
          </h2>
          <p className="mt-1 text-sm text-texto-3">% de la venta de la categoría que se ajustó.</p>
        </div>
        <table className="tabla">
          <thead>
            <tr>
              <th className="text-left">Tienda</th>
              {principales.map((nombre) => (
                <th key={nombre}>{nombre.toLowerCase()}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tiendas.map((tienda) => (
              <tr key={tienda}>
                <td className="text-left">{tienda}</td>
                {principales.map((nombre) => {
                  const valor = celda(tienda, nombre);
                  const referencia = sobre(zona.get(nombre)!.monto, zona.get(nombre)!.ventas);
                  const peor = valor !== null && referencia !== null && Math.abs(valor) > Math.abs(referencia) * 1.5;
                  return (
                    <td key={nombre} className={peor ? "font-medium text-alerta" : ""}>
                      {porcentaje(valor, 2)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
