import { expect } from 'vitest';
import * as authService from './auth.service.js';
import * as gruposService from './grupos.service.js';
import * as gastosService from './gastos.service.js';
import * as liquidacionesService from './liquidaciones.service.js';

// Escenario compartido por los tests de dialecto (pg-mem) y de Postgres real:
// misma cuenta de gastos, mismos balances esperados, y el error de email duplicado.
// Requiere que las migraciones ya se hayan aplicado en la base conectada.
export async function ejecutarEscenarioBalances() {
  const ana = await authService.crearUsuario({ nombre: 'Ana', email: 'ana@escenario.com', password: 'password123' });
  const bruno = await authService.crearUsuario({ nombre: 'Bruno', email: 'bruno@escenario.com', password: 'password123' });
  const carla = await authService.crearUsuario({ nombre: 'Carla', email: 'carla@escenario.com', password: 'password123' });

  const grupo = await gruposService.crearGrupo({ nombre: 'Test PG', creadorId: ana.id });
  await gruposService.unirseAGrupo({ codigo: grupo.codigo_invitacion, usuarioId: bruno.id });
  await gruposService.unirseAGrupo({ codigo: grupo.codigo_invitacion, usuarioId: carla.id });

  const gasto1 = await gastosService.crearGasto({
    grupoId: grupo.id,
    pagadoPor: ana.id,
    descripcion: 'Cena',
    montoTotal: 30,
    items: [
      { nombre_item: 'Pizza', precio: 12 },
      { nombre_item: 'Pasta', precio: 18 },
    ],
  });
  await gastosService.asignarUsuariosAItem(gasto1.items[0].id, [ana.id, bruno.id]);
  await gastosService.asignarUsuariosAItem(gasto1.items[1].id, [ana.id, bruno.id, carla.id]);

  const gasto2 = await gastosService.crearGasto({
    grupoId: grupo.id,
    pagadoPor: bruno.id,
    descripcion: 'Bar',
    montoTotal: 45,
    items: [{ nombre_item: 'Rondas', precio: 40 }],
  });
  await gastosService.dividirPartesIguales(gasto2.id, [ana.id, bruno.id, carla.id]);

  const balances = await liquidacionesService.calcularBalances(grupo.id);
  const porNombre = Object.fromEntries(balances.map((b) => [b.nombre, b.balance]));

  expect(porNombre.Ana).toBe(3);
  expect(porNombre.Bruno).toBe(18);
  expect(porNombre.Carla).toBe(-21);

  const transacciones = liquidacionesService.simplificarDeudas(balances);
  const liquidaciones = await liquidacionesService.guardarLiquidacionesCalculadas(grupo.id, transacciones);
  expect(liquidaciones).toHaveLength(2);

  // Email duplicado: confirma que el codigo de error 23505 de Postgres
  // (distinto del mensaje de texto de SQLite) se reconoce correctamente
  await expect(
    authService.crearUsuario({ nombre: 'Otra', email: 'ana@escenario.com', password: 'password123' })
  ).rejects.toMatchObject({ code: '23505' });
}
