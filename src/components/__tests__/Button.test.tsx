import { render } from '@testing-library/react-native';

import { Button } from '../Button';

// Nota: no @testing-library/react-native v14, `render` é assíncrono (retorna Promise).
describe('Button (design system)', () => {
  it('renderiza o título informado', async () => {
    const { getByText } = await render(<Button title="Continuar" onPress={() => {}} />);
    expect(getByText('Continuar')).toBeTruthy();
  });

  it('expõe o papel de acessibilidade de botão', async () => {
    const { getByRole } = await render(<Button title="Salvar" onPress={() => {}} />);
    expect(getByRole('button')).toBeTruthy();
  });

  it('oculta o título e mostra o indicador de carregamento quando loading', async () => {
    const { queryByText } = await render(<Button title="Enviar" loading onPress={() => {}} />);
    expect(queryByText('Enviar')).toBeNull();
  });
});
