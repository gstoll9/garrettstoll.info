import { Billboard, Text } from '@react-three/drei'

type LabelProps = {
  text: string
  position: [number, number, number]
  fontSize?: number
}

export default function Label({ text, position, fontSize = 1 }: LabelProps) {
  return (
    <Billboard position={position}>
      <Text
        fontSize={fontSize}
        color="white"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.05 * fontSize}
        outlineColor="black"
      >
        {text}
      </Text>
    </Billboard>
  )
}
