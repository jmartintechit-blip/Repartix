import { useState } from 'react';
import Input from '../ui/Input.jsx';
import Button from '../ui/Button.jsx';
import { crearGasto } from '../../api/gastos.js';
import { useAuth } from '../../context/AuthContext.jsx';
import styles from './FormularioNuevoGasto.module.css';

export default function FormularioNuevoGasto({ grupoId, miembros, onCreado }) {
  const { token, usuario } = useAuth();

  const [descripcion, setDescripcion] = useState('');
  const [montoTotal, setMontoTotal] = useState('');
  const [pagadoPor, setPagadoPor] = useState(usuario.id);
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  function agregarItem() {
    setItems((prev) => [...prev, { nombre_item: '', precio: '' }]);
  }

  function actualizarItem(indice, campo, valor) {
    setItems((prev) => prev.map((item, i) => (i === indice ? { ...item, [campo]: valor } : item)));
  }

  function quitarItem(indice) {
    setItems((prev) => prev.filter((_, i) => i !== indice));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      const itemsValidos = items
        .filter((item) => item.nombre_item.trim() && item.precio !== '')
        .map((item) => ({ nombre_item: item.nombre_item.trim(), precio: Number(item.precio) }));

      const { gasto } = await crearGasto(token, grupoId, {
        descripcion,
        monto_total: Number(montoTotal),
        pagado_por: Number(pagadoPor),
        items: itemsValidos.length > 0 ? itemsValidos : undefined,
      });
      onCreado(gasto);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <Input
        label="Descripcion"
        placeholder="Cena del sabado"
        value={descripcion}
        onChange={(e) => setDescripcion(e.target.value)}
        required
        autoFocus
      />
      <Input
        label="Importe total"
        type="number"
        step="0.01"
        min="0.01"
        placeholder="0.00"
        value={montoTotal}
        onChange={(e) => setMontoTotal(e.target.value)}
        required
      />
      <div className={styles.campo}>
        <label className={styles.label} htmlFor="pagado-por">
          Quien pago
        </label>
        <select
          id="pagado-por"
          className={styles.select}
          value={pagadoPor}
          onChange={(e) => setPagadoPor(e.target.value)}
        >
          {miembros.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nombre}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.itemsHeader}>
        <span className={styles.label}>Items (opcional)</span>
        <button type="button" className={styles.botonAgregar} onClick={agregarItem}>
          + Añadir item
        </button>
      </div>
      {items.length === 0 && (
        <p className={styles.ayuda}>Si no detallas items, se creara uno unico por el importe total.</p>
      )}
      {items.map((item, indice) => (
        <div key={indice} className={styles.fila}>
          <input
            className={styles.itemNombre}
            placeholder="Nombre del item"
            value={item.nombre_item}
            onChange={(e) => actualizarItem(indice, 'nombre_item', e.target.value)}
          />
          <input
            className={styles.itemPrecio}
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={item.precio}
            onChange={(e) => actualizarItem(indice, 'precio', e.target.value)}
          />
          <button
            type="button"
            className={styles.quitar}
            onClick={() => quitarItem(indice)}
            aria-label="Quitar item"
          >
            ✕
          </button>
        </div>
      ))}

      {error && <p className={styles.error}>{error}</p>}
      <Button type="submit" fullWidth loading={enviando}>
        Guardar gasto
      </Button>
    </form>
  );
}
