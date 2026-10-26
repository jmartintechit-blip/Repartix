import { describe, it, expect } from 'vitest';
import { detectarTipoImagen } from './subidaImagen.js';

const relleno = Buffer.alloc(16);

describe('detectarTipoImagen: confirma el tipo real por los primeros bytes', () => {
  it('reconoce JPEG, PNG, WEBP y HEIC', () => {
    expect(detectarTipoImagen(Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), relleno]))).toBe('image/jpeg');
    expect(
      detectarTipoImagen(Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), relleno])),
    ).toBe('image/png');
    expect(detectarTipoImagen(Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP'), relleno]))).toBe(
      'image/webp',
    );
    expect(detectarTipoImagen(Buffer.concat([Buffer.alloc(4), Buffer.from('ftypheic'), relleno]))).toBe('image/heic');
  });

  it('rechaza texto, HTML, ficheros vacios y cabeceras truncadas', () => {
    expect(detectarTipoImagen(Buffer.from('<html><script>alert(1)</script></html>'))).toBeNull();
    expect(detectarTipoImagen(Buffer.from('esto no es una imagen'))).toBeNull();
    expect(detectarTipoImagen(Buffer.alloc(0))).toBeNull();
    expect(detectarTipoImagen(Buffer.from([0xff, 0xd8]))).toBeNull();
    expect(detectarTipoImagen(Buffer.concat([Buffer.alloc(4), Buffer.from('ftypmp42'), relleno]))).toBeNull();
  });
});
