export default function NextPage() {
    return (
        <div style={{ display: "flex" }}>
            <div className="left" style={{ flex: 1, order: 0, alignItems: "left" }}>
                <div>left</div>
            </div>
            <div className="right" style={{ flex: 1, order: 1, alignItems: "right" }}>
                <div>right</div>
            </div>
        </div>
    );
}