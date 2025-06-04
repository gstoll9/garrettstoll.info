"use client"
import "./styles/header.css";
import Image from "next/image";
import * as React from "react";

const images = [
  "/TyroImages/PuppyEyes.png",
  "/TyroImages/HighFive.png",
  "/TyroImages/AnOfferYouCantRefuse.png",
];

function getRandomImage(current: string) {
  let filtered = images.filter(img => img !== current);
  if (filtered.length === 0) filtered = images;
  return filtered[Math.floor(Math.random() * filtered.length)];
}

function getRandomAngle() {
  // Random angle between -30 and 30 degrees
  return Math.random() * 60 - 30;
}

type HeaderProps = {
  title?: string;
}

function Header({ title = "Garrett Stoll" }: HeaderProps) {

  const [left, setLeft] = React.useState({
    src: images[0],
    angle: 0,
    visible: true,
  });
  const [right, setRight] = React.useState({
    src: images[0],
    angle: 0,
    visible: true,
  });

  React.useEffect(() => {
    let leftTimeout: NodeJS.Timeout;
    let rightTimeout: NodeJS.Timeout;

    function schedulePop(setter: typeof setLeft, getCurrent: () => { src: string }) {
      const delay = 1000 + Math.random() * 3000;
      setTimeout(() => {
        const currentSrc = getCurrent().src;
        setter(prev => ({ ...prev, visible: false }));
        setTimeout(() => {
          setter({
            src: getRandomImage(currentSrc),
            angle: getRandomAngle(),
            visible: true,
          });
          schedulePop(setter, getCurrent); // Schedule next pop using latest state
        }, 300); // match CSS transition duration
      }, delay);
    }

    leftTimeout = setTimeout(() => schedulePop(setLeft, () => left), 1000);
    rightTimeout = setTimeout(() => schedulePop(setRight, () => right), 2000);

    return () => {
      clearTimeout(leftTimeout);
      clearTimeout(rightTimeout);
    };
    // eslint-disable-next-line
  }, []);

  return (
    <header>
      <div className="leftTyroContainer">
        <Image
          key={left.src} // Add this line!
          className={`logo pop-image${left.visible ? " visible" : ""}`}
          src={left.src}
          alt="Tyro, the cat, on his back looking cute as hell"
          width={120}
          height={120}
          sizes="100%"
          style={{
            transition: "opacity 0.3s, transform 0.3s",
            opacity: left.visible ? 1 : 0,
            transform: `scale(${left.visible ? 1 : 0.7}) rotate(${left.angle}deg)`,
          }}
          unoptimized
        />
      </div>
      <h1 className="headerText">{title}</h1>
      <div className="rightTyroContainer">
        <Image
          key={right.src} // Add this line!
          className={`logo pop-image${right.visible ? " visible" : ""}`}
          src={right.src}
          alt="Tyro, the cat, on his back looking cute as hell"
          width={120}
          height={120}
          sizes="100%"
          style={{
            transition: "opacity 0.3s, transform 0.3s",
            opacity: right.visible ? 1 : 0,
            transform: `scale(${right.visible ? 1 : 0.7}) rotate(${right.angle}deg)`,
          }}
        />
      </div>
    </header>
  );
}

export default Header;