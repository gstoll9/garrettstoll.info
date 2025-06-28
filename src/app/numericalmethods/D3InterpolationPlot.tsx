import React, { useRef, useEffect } from "react";
import * as d3 from "d3";

type Point = { x: number; y: number };

const WIDTH = 700;
const HEIGHT = 300;
const MARGIN = { top: 30, right: 30, bottom: 40, left: 50 };

const points: Point[] = [
  { x: 0, y: Math.exp(0) },
  { x: 0.5, y: Math.exp(0.5) },
  { x: 1, y: Math.exp(1) },
  { x: 1.5, y: Math.exp(1.5) },
  { x: 2, y: Math.exp(2) },
];

export default function D3InterpolationPlot() {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Scales
    const x = d3
      .scaleLinear()
      .domain([0, 2])
      .range([MARGIN.left, WIDTH - MARGIN.right]);
    const y = d3
      .scaleLinear()
      .domain([0, Math.exp(2) * 1.1])
      .range([HEIGHT - MARGIN.bottom, MARGIN.top]);

    // Axes
    svg
      .append("g")
      .attr("transform", `translate(0,${HEIGHT - MARGIN.bottom})`)
      .call(d3.axisBottom(x));
    svg
      .append("g")
      .attr("transform", `translate(${MARGIN.left},0)`)
      .call(d3.axisLeft(y));

    // Grid
    svg
      .append("g")
      .attr("class", "grid")
      .attr("transform", `translate(0,${HEIGHT - MARGIN.bottom})`)
      .call(
        d3
          .axisBottom(x)
          .tickSize(-(HEIGHT - MARGIN.top - MARGIN.bottom))
          .tickFormat(() => "")
      );
    svg
      .append("g")
      .attr("class", "grid")
      .attr("transform", `translate(${MARGIN.left},0)`)
      .call(
        d3
          .axisLeft(y)
          .tickSize(-(WIDTH - MARGIN.left - MARGIN.right))
          .tickFormat(() => "")
      );

    // Blue linear lines between points
    const line = d3
      .line<Point>()
      .x((d) => x(d.x))
      .y((d) => y(d.y));
    svg
      .append("path")
      .datum(points)
      .attr("fill", "none")
      .attr("stroke", "#3498db")
      .attr("stroke-width", 2)
      .attr("d", line);

    // Red dots at points
    svg
      .selectAll("circle")
      .data(points)
      .enter()
      .append("circle")
      .attr("cx", (d) => x(d.x))
      .attr("cy", (d) => y(d.y))
      .attr("r", 5)
      .attr("fill", "red")

    // Smooth function (e^x)
    const smoothData = d3.range(0, 2.01, 0.01).map((xVal) => ({
      x: xVal,
      y: Math.exp(xVal),
    }));
    const smoothLine = d3
      .line<Point>()
      .x((d) => x(d.x))
      .y((d) => y(d.y))
      .curve(d3.curveMonotoneX);
    svg
      .append("path")
      .datum(smoothData)
      .attr("fill", "none")
      .attr("stroke", "#2ecc40")
      .attr("stroke-width", 2)
      .attr("d", smoothLine);

    // Style grid lines
    svg.selectAll(".grid line")
      .attr("stroke", "#bbb")
      .attr("stroke-opacity", 0.3)
      .attr("shape-rendering", "crispEdges");
    svg.selectAll(".grid path").remove();
  }, []);

  return (
    <svg
      ref={svgRef}
      width={'100%'}
      height={HEIGHT}
      style={{ background: "#e9efe9", borderRadius: 8, margin: "1em 0" }}
    />
  );
}