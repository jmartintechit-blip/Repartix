import { useState } from 'react';
import Input from '../ui/Input.jsx';
import Button from '../ui/Button.jsx';
import { crearGrupo } from '../../api/grupos.js';
import { useAuth } from '../../context/AuthContext.jsx';
import styles from './Formulario.module.css';

export default function FormularioCrearGrupo({ onCreado }) {
  const { token } = useAuth();
  const [nombre, setNombre] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      const { grupo } = await crearGrupo(token, { nombre });
      onCreado(grupo);
    } catch (err) {
      setError(err.detalles?.nombre?.[0] ?? err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <Input
        label="Nombre del grupo"
        placeholder="Viaje a Lisboa"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        error={error}
        autoFocus
        required
      />
      <Button type="submit" fullWidth loading={enviando}>
        Crear grupo
      </Button>
    </form>
  );
}
