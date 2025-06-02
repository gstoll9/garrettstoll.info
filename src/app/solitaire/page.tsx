import Board from './components/Board';
import StandardLayout from '@/layouts/StandardLayout';

export default function Home() {
  const main = (
    <div className="solitaire-container">
      <Board />
    </div>
  );

  return StandardLayout({title: "Solitaire", main});
}