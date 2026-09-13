import styles from './Avatar.module.css';

const COLORES = ['#e15b36', '#1b6e64', '#b9770e', '#7a5c99', '#2e6da4'];

function colorParaNombre(nombre) {
  const codigo = nombre.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return COLORES[codigo % COLORES.length];
}

function iniciales(nombre) {
  return nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join('');
}

export default function Avatar({ nombre, size = 36 }) {
  return (
    <span
      className={styles.avatar}
      style={{ width: size, height: size, fontSize: size * 0.4, background: colorParaNombre(nombre) }}
      title={nombre}
    >
      {iniciales(nombre)}
    </span>
  );
}
