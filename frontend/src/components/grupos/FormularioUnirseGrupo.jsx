import { useState } from 'react';
import Input from '../ui/Input.jsx';
import Button from '../ui/Button.jsx';
import { unirseAGrupo } from '../../api/grupos.js';
import { useAuth } from '../../context/AuthContext.jsx';
import styles from './Formulario.module.css';

export default function FormularioUnirseGrupo({ onUnido }) {
  const { token } = useAuth();
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      const { grupo } = await unirseAGrupo(token, { codigo_invitacion: codigo });
      onUnido(grupo);
    } catch (err) {
      setError(err.detalles?.codigo_invitacion?.[0] ?? err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <Input
        label="Codigo de invitacion"
        placeholder="ABC123"
        value={codigo}
        onChange={(e) => setCodigo(e.target.value)}
        error={error}
        autoFocus
        required
      />
      <Button type="submit" fullWidth loading={enviando}>
        Unirse
      </Button>
    </form>
  );
}
