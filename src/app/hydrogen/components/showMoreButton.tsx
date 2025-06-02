import "../styles/showMoreButton.css";

type ShowMoreButtonProps = {
    expanded: boolean;
    onClick: () => void;
};

export default function ShowMoreButton({ expanded, onClick }: ShowMoreButtonProps) {
  return (
    <div className="showMore-container">
        <div className="showMore-divider" />
        <button
            className="showMore-button"
            onClick={onClick}
        >
            {expanded ? 'Show Less' : 'Show More'}
        </button>
        <div className="showMore-divider" />
    </div>
  );
}