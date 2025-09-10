import { render, screen } from '@testing-library/react';
import App from './App';

test('renders app title', () => {
  render(<App />);
  const title = screen.getByText(/Q&A Assistant/i);
  expect(title).toBeInTheDocument();
});
