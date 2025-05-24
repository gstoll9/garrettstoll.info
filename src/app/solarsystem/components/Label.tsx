import { Billboard, Text } from '@react-three/drei'

type LabelProps = {
  text: string
  position: [number, number, number]
}

export default function Label({ text, position }: LabelProps) {
  return (
    <Billboard position={position}>
      <Text
        fontSize={1}
        color="white"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.05}
        outlineColor="black"
      >
        {text}
      </Text>
    </Billboard>
  )
}
