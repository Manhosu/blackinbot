'use client';

import { Box, VStack, Heading, Text, Button, Icon } from '@chakra-ui/react';
import { FiBox } from 'react-icons/fi';

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactElement;
}

export default function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon
}: EmptyStateProps) {
  return (
    <Box 
      p={8} 
      borderRadius="md" 
      borderWidth="1px" 
      borderColor="gray.200"
      bg="gray.50"
      textAlign="center"
      width="100%"
    >
      <VStack spacing={4}>
        <Icon as={icon || FiBox} boxSize={12} color="gray.400" />
        
        <Heading size="md" color="gray.700">
          {title}
        </Heading>
        
        <Text color="gray.500">
          {description}
        </Text>
        
        {actionLabel && onAction && (
          <Button 
            colorScheme="brand" 
            onClick={onAction}
            mt={2}
          >
            {actionLabel}
          </Button>
        )}
      </VStack>
    </Box>
  );
} 