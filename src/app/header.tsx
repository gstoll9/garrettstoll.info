"use client"
import "./header.css";
import Image from "next/image";
import { useEffect, useState } from 'react';


function getImageAspectRatio(src: string): Promise<number> {
  return new Promise((resolve) => {
    if (typeof window !== "undefined") {
      const img = new window.Image();
      img.src = src;
      img.onload = () => {
        resolve(img.naturalWidth / img.naturalHeight);
      };
    } else {
      resolve(1); // Default aspect ratio if window is not defined
    }
  });
}

let tyroRatio: number;
tyroRatio = await getImageAspectRatio("/Tyro.png");

function getPage(main: React.ReactNode) {

  const [tyroRatio, setTyroRatio] = useState(1);
  useEffect(() => {
    async function fetchImageRatios() {
      const tyro = await getImageAspectRatio("/Tyro.png");
      setTyroRatio(tyro);
    }
    fetchImageRatios();
  }, []);

  return (
    <div className="container0">
      <header>
        <div className="leftTyroContainer">
          <Image className="logo" src="/Tyro.png" alt="Tyro, the cat, on his back looking cute as hell" width={tyroRatio} height={1} layout="responsive" />
        </div>
        <h1 className="headerText">Garrett Stoll</h1>
        <div className="rightTyroContainer">
          <Image className="logo" src="/Tyro.png" alt="Tyro, the cat, on his back looking cute as hell" width={tyroRatio} height={1} layout="responsive" />
        </div>
      </header>
      <main>
        {main}
      </main>
    </div>
  );
}

export { getPage, getImageAspectRatio };