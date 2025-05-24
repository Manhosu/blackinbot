'use client';

import { Box, Flex, Spinner, Text } from '@chakra-ui/react';

interface PageLoadingProps {
  message?: string;
}

export default function PageLoading({ message = 'Carregando...' }: PageLoadingProps) {
  return (
    <Flex 
      width="100%" 
      height="50vh" 
      alignItems="center" 
      justifyContent="center" 
      flexDirection="column"
    >
      <Spinner 
        thickness="4px"
        speed="0.65s"
        emptyColor="gray.200"
        color="brand.500"
        size="xl"
        mb={4}
      />
      <Text color="gray.500" fontSize="lg" fontWeight="medium">
        {message}
      </Text>
    </Flex>
  );
} 