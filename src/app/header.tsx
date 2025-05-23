"use client"
import "./styles/header.css";
import Image from "next/image";
import { useEffect, useState } from 'react';
import { getImageAspectRatio } from "./util";

let tyroRatio: number;
tyroRatio = await getImageAspectRatio("/Tyro.png");

function Header(): JSX.Element {

  const [tyroRatio, setTyroRatio] = useState(1);
  useEffect(() => {
    async function fetchImageRatios() {
      const tyro = await getImageAspectRatio("/Tyro.png");
      setTyroRatio(tyro);
    }
    fetchImageRatios();
  }, []);

  return (
    <header>
      <div className="leftTyroContainer">
        <Image className="logo" src="/Tyro.png" alt="Tyro, the cat, on his back looking cute as hell" width={tyroRatio} height={1} layout="responsive" />
      </div>
      <h1 className="headerText">Garrett Stoll</h1>
      <div className="rightTyroContainer">
        <Image className="logo" src="/Tyro.png" alt="Tyro, the cat, on his back looking cute as hell" width={tyroRatio} height={1} layout="responsive" />
      </div>
    </header>
  );
}

export default Header;