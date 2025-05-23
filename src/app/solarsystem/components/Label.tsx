import { Text } from '@react-three/drei'

type LabelProps = {
  text: string
  position: [number, number, number]
}

export default function Label({ text, position }: LabelProps) {
  return (
    <Text
      position={position}
      fontSize={1}
      color="white"
      anchorX="center"
      anchorY="middle"
      outlineWidth={0.05}
      outlineColor="black"
    >
      {text}
    </Text>
  )
}
