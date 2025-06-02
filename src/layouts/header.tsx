"use client"
import "./styles/header.css";
import Image from "next/image";
import * as React from "react";

type HeaderProps = {
  title?: string;
}

function Header({ title = "Garrett Stoll" }: HeaderProps) {
  return (
    <header>
      <div className="leftTyroContainer">
        <Image 
          className="logo" 
          src="/TyroImages/Tyro.png" 
          alt="Tyro, the cat, on his back looking cute as hell" 
          width={0}
          height={0}
          sizes="100%"
        />
      </div>
      <h1 className="headerText">{title}</h1>
      <div className="rightTyroContainer">
        <Image
          className="logo"
          src="/TyroImages/Tyro.png"
          alt="Tyro, the cat, on his back looking cute as hell"
          width={0}
          height={0}
          sizes="100%"
        />
      </div>
    </header>
  );
}

export default Header;