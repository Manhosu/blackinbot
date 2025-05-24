import { Box, Table, Thead, Tbody, Tr, Th, Td, Badge } from '@chakra-ui/react'

interface Transaction {
  id: string
  date: string
  type: 'saque' | 'antecipacao'
  amount: number
  status: 'pendente' | 'concluido' | 'rejeitado'
}

const mockTransactions: Transaction[] = [
  {
    id: '1',
    date: '2024-01-15',
    type: 'saque',
    amount: 1000,
    status: 'concluido'
  },
  {
    id: '2',
    date: '2024-01-14',
    type: 'antecipacao',
    amount: 500,
    status: 'pendente'
  }
]

export function TransactionHistory() {
  const getStatusColor = (status: Transaction['status']) => {
    switch (status) {
      case 'concluido':
        return 'green'
      case 'pendente':
        return 'yellow'
      case 'rejeitado':
        return 'red'
      default:
        return 'gray'
    }
  }

  return (
    <Box overflowX="auto">
      <Table variant="simple">
        <Thead>
          <Tr>
            <Th>Data</Th>
            <Th>Tipo</Th>
            <Th>Valor</Th>
            <Th>Status</Th>
          </Tr>
        </Thead>
        <Tbody>
          {mockTransactions.map(transaction => (
            <Tr key={transaction.id}>
              <Td>{new Date(transaction.date).toLocaleDateString('pt-BR')}</Td>
              <Td textTransform="capitalize">{transaction.type}</Td>
              <Td>
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                }).format(transaction.amount)}
              </Td>
              <Td>
                <Badge colorScheme={getStatusColor(transaction.status)}>
                  {transaction.status}
                </Badge>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  )
} 