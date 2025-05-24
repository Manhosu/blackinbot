import { Box, Heading, Text } from '@chakra-ui/react'

interface BalanceCardProps {
  title: string
  amount: number
  type: 'available' | 'pending'
}

export function BalanceCard({ title, amount, type }: BalanceCardProps) {
  const bgColor = type === 'available' ? 'green.50' : 'yellow.50'
  const textColor = type === 'available' ? 'green.500' : 'yellow.600'

  return (
    <Box p={6} bg={bgColor} borderRadius="lg" shadow="sm">
      <Heading size="md" mb={2} color="gray.700">{title}</Heading>
      <Text fontSize="2xl" fontWeight="bold" color={textColor}>
        {new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL'
        }).format(amount)}
      </Text>
    </Box>
  )
} 