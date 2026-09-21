import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from './connection.js';

// Cada createTable va envuelto en un hasTable(): en una instalacion ya
// migrada no se re-ejecuta, asi que los indices y columnas definidos dentro
// del propio createTable tambien quedan a salvo de duplicarse.
async function crearTablaSiNoExiste(nombre, definir) {
  const existe = await db.schema.hasTable(nombre);
  if (!existe) await db.schema.createTable(nombre, definir);
}

async function crearBaseSchema() {
  await crearTablaSiNoExiste('usuarios', (table) => {
    table.increments('id').primary();
    table.string('nombre').notNullable();
    table.string('email').notNullable().unique();
    table.string('password_hash').notNullable();
    table.string('fecha_creacion').notNullable();
  });

  await crearTablaSiNoExiste('grupos', (table) => {
    table.increments('id').primary();
    table.string('nombre').notNullable();
    table.string('codigo_invitacion').notNullable().unique();
    table.string('fecha_creacion').notNullable();
  });

  await crearTablaSiNoExiste('usuario_grupo', (table) => {
    table.integer('usuario_id').notNullable().references('id').inTable('usuarios').onDelete('CASCADE');
    table.integer('grupo_id').notNullable().references('id').inTable('grupos').onDelete('CASCADE');
    table.string('fecha_union').notNullable();
    table.primary(['usuario_id', 'grupo_id']);
    table.index(['grupo_id'], 'idx_usuario_grupo_grupo');
  });

  await crearTablaSiNoExiste('gastos', (table) => {
    table.increments('id').primary();
    table.integer('grupo_id').notNullable().references('id').inTable('grupos').onDelete('CASCADE');
    table.integer('pagado_por').notNullable().references('id').inTable('usuarios');
    table.string('descripcion').notNullable();
    table.float('monto_total').notNullable();
    table.string('fecha').notNullable();
    table.string('imagen_url');
    table.index(['grupo_id'], 'idx_gastos_grupo');
  });

  await crearTablaSiNoExiste('items_gasto', (table) => {
    table.increments('id').primary();
    table.integer('gasto_id').notNullable().references('id').inTable('gastos').onDelete('CASCADE');
    table.string('nombre_item').notNullable();
    table.float('precio').notNullable();
    table.integer('cantidad').notNullable().defaultTo(1);
    table.index(['gasto_id'], 'idx_items_gasto_gasto');
  });

  await crearTablaSiNoExiste('item_asignacion', (table) => {
    table.integer('item_id').notNullable().references('id').inTable('items_gasto').onDelete('CASCADE');
    table.integer('usuario_id').notNullable().references('id').inTable('usuarios').onDelete('CASCADE');
    table.primary(['item_id', 'usuario_id']);
    table.index(['usuario_id'], 'idx_item_asignacion_usuario');
  });

  await crearTablaSiNoExiste('liquidaciones', (table) => {
    table.increments('id').primary();
    table.integer('grupo_id').notNullable().references('id').inTable('grupos').onDelete('CASCADE');
    table.integer('de_usuario_id').notNullable().references('id').inTable('usuarios');
    table.integer('a_usuario_id').notNullable().references('id').inTable('usuarios');
    table.float('monto').notNullable();
    // useNative: false -> CHECK constraint en ambos dialectos, en vez de un
    // tipo ENUM nativo de Postgres (mas simple de evolucionar mas adelante)
    table.enum('estado', ['pendiente', 'pagado'], { useNative: false }).notNullable().defaultTo('pendiente');
    table.string('fecha').notNullable();
    table.string('fecha_pago');
    table.index(['grupo_id'], 'idx_liquidaciones_grupo');
  });
}

// Cambios de esquema futuros sobre tablas que ya tengan datos se añaden aqui
// con table.hasColumn + alterTable, para no perder datos ni fallar en
// instalaciones ya migradas.
export async function migrate() {
  await crearBaseSchema();
}

const isMainModule = path.resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url);

if (isMainModule) {
  migrate()
    .then(() => {
      console.log('Migraciones aplicadas correctamente.');
      return db.destroy();
    })
    .catch((err) => {
      console.error('Error aplicando migraciones:', err);
      process.exit(1);
    });
}
