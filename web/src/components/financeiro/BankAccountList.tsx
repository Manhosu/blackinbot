"use client"

import { useState } from 'react'
import { Box, Button, FormControl, FormLabel, Input, Stack, Text, useToast, VStack } from '@chakra-ui/react'
import { useForm } from 'react-hook-form'

interface BankAccount {
  id: string
  bank: string
  agency: string
  account: string
}

export function BankAccountList() {
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const toast = useToast()
  const { register, handleSubmit, reset } = useForm()

  const onSubmit = (data: any) => {
    const newAccount = {
      id: Math.random().toString(36).substr(2, 9),
      ...data
    }
    setAccounts([...accounts, newAccount])
    reset()
    toast({
      title: 'Conta bancária adicionada',
      status: 'success',
      duration: 3000,
    })
  }

  const handleRemove = (id: string) => {
    setAccounts(accounts.filter(account => account.id !== id))
    toast({
      title: 'Conta bancária removida',
      status: 'info',
      duration: 3000,
    })
  }

  return (
    <Box>
      <form onSubmit={handleSubmit(onSubmit)}>
        <Stack spacing={4} mb={6}>
          <FormControl>
            <FormLabel>Banco</FormLabel>
            <Input {...register('bank')} required />
          </FormControl>
          <FormControl>
            <FormLabel>Agência</FormLabel>
            <Input {...register('agency')} required />
          </FormControl>
          <FormControl>
            <FormLabel>Conta</FormLabel>
            <Input {...register('account')} required />
          </FormControl>
          <Button type="submit" colorScheme="blue">
            Adicionar Conta
          </Button>
        </Stack>
      </form>

      <VStack spacing={4} align="stretch">
        {accounts.map(account => (
          <Box 
            key={account.id} 
            p={4} 
            borderWidth={1} 
            borderRadius="md"
            display="flex"
            justifyContent="space-between"
            alignItems="center"
          >
            <Box>
              <Text fontWeight="bold">{account.bank}</Text>
              <Text fontSize="sm">Agência: {account.agency} | Conta: {account.account}</Text>
            </Box>
            <Button 
              size="sm" 
              colorScheme="red" 
              onClick={() => handleRemove(account.id)}
            >
              Remover
            </Button>
          </Box>
        ))}
      </VStack>
    </Box>
  )
} 