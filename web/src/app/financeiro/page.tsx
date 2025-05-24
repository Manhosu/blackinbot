import { Box, Container, Heading, SimpleGrid, Tab, TabList, TabPanel, TabPanels, Tabs } from '@chakra-ui/react'
import { BalanceCard } from '@/components/financeiro/BalanceCard'
import { BankAccountList } from '@/components/financeiro/BankAccountList'
import { TransactionHistory } from '@/components/financeiro/TransactionHistory'

export default function FinanceiroPage() {
  return (
    <Container maxW="container.xl" py={8}>
      <Heading mb={6}>Financeiro</Heading>
      
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6} mb={8}>
        <BalanceCard 
          title="Saldo Disponível"
          amount={1250.00}
          type="available"
        />
        <BalanceCard 
          title="Saldo Pendente"
          amount={450.00}
          type="pending"
        />
      </SimpleGrid>

      <Tabs variant="enclosed">
        <TabList>
          <Tab>Contas Bancárias</Tab>
          <Tab>Histórico</Tab>
        </TabList>

        <TabPanels>
          <TabPanel>
            <BankAccountList />
          </TabPanel>
          <TabPanel>
            <TransactionHistory />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Container>
  )
} 