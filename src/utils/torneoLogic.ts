import { ParejaTorneo, PartidoTorneo, TorneoData } from '../types';

export function calcularEstructuraZonas(cantParejas: number): { cantZonas: number; parejasPorZona: number; pasanPorZona: number } {
  if (cantParejas <= 4) {
    return { cantZonas: 1, parejasPorZona: cantParejas, pasanPorZona: 2 };
  } else if (cantParejas <= 6) {
    return { cantZonas: 2, parejasPorZona: 3, pasanPorZona: 2 };
  } else if (cantParejas <= 8) {
    return { cantZonas: 2, parejasPorZona: 4, pasanPorZona: 2 };
  } else if (cantParejas <= 12) {
    return { cantZonas: 4, parejasPorZona: 3, pasanPorZona: 1 };
  } else {
    // 16 parejas
    return { cantZonas: 4, parejasPorZona: 4, pasanPorZona: 2 };
  }
}

export function construirZonasYPartidos(parejas: ParejaTorneo[]): TorneoData['zonas'] {
  const { cantZonas, parejasPorZona } = calcularEstructuraZonas(parejas.length);
  const nombresZonas = ['Zona A', 'Zona B', 'Zona C', 'Zona D'];
  const zonasResultado: TorneoData['zonas'] = [];

  for (let z = 0; z < cantZonas; z++) {
    const nombreZona = nombresZonas[z];
    const inicio = z * parejasPorZona;
    const parejasDeZona = parejas.slice(inicio, inicio + parejasPorZona);
    const parejasIds = parejasDeZona.map(p => p.id);
    const partidos: PartidoTorneo[] = [];

    // Generar todos contra todos en la zona
    let pNum = 1;
    for (let i = 0; i < parejasDeZona.length; i++) {
      for (let j = i + 1; j < parejasDeZona.length; j++) {
        partidos.push({
          id: `${nombreZona}-P${pNum++}`,
          zona: nombreZona,
          p1Id: parejasDeZona[i].id,
          p2Id: parejasDeZona[j].id,
          p1Nombre: parejasDeZona[i].nombre,
          p2Nombre: parejasDeZona[j].nombre,
          jugado: false
        });
      }
    }

    zonasResultado.push({
      nombre: nombreZona,
      parejasIds,
      partidos
    });
  }

  return zonasResultado;
}

export function registrarResultadoPartido(
  torneo: TorneoData,
  partidoId: string,
  p1Tantos: number,
  p2Tantos: number
): TorneoData {
  let encontrado = false;
  let p1Id = 0;
  let p2Id = 0;

  const nuevasZonas = torneo.zonas.map(z => ({
    ...z,
    partidos: z.partidos.map(p => {
      if (p.id === partidoId) {
        encontrado = true;
        p1Id = p.p1Id;
        p2Id = p.p2Id;
        return {
          ...p,
          resultadoP1: p1Tantos,
          resultadoP2: p2Tantos,
          jugado: true,
          ganadorId: p1Tantos > p2Tantos ? p.p1Id : p.p2Id
        };
      }
      return p;
    })
  }));

  if (!encontrado) return torneo;

  // Actualizar tabla de posiciones de las parejas
  const nuevasParejas = torneo.parejas.map(p => {
    if (p.id === p1Id) {
      const gano = p1Tantos > p2Tantos;
      return {
        ...p,
        partidosJugados: p.partidosJugados + 1,
        partidosGanados: gano ? p.partidosGanados + 1 : p.partidosGanados,
        puntos: p.puntos + (gano ? 2 : 1),
        tantosAFavor: p.tantosAFavor + p1Tantos,
        tantosEnContra: p.tantosEnContra + p2Tantos,
        difTantos: (p.tantosAFavor + p1Tantos) - (p.tantosEnContra + p2Tantos)
      };
    }
    if (p.id === p2Id) {
      const gano = p2Tantos > p1Tantos;
      return {
        ...p,
        partidosJugados: p.partidosJugados + 1,
        partidosGanados: gano ? p.partidosGanados + 1 : p.partidosGanados,
        puntos: p.puntos + (gano ? 2 : 1),
        tantosAFavor: p.tantosAFavor + p2Tantos,
        tantosEnContra: p.tantosEnContra + p1Tantos,
        difTantos: (p.tantosAFavor + p2Tantos) - (p.tantosEnContra + p1Tantos)
      };
    }
    return p;
  });

  return {
    ...torneo,
    parejas: nuevasParejas,
    zonas: nuevasZonas
  };
}
