import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CreateOvertimeForm from '@/components/CreateOvertimeForm';
import * as apiClient from '@/lib/api-client';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      back: jest.fn(),
    };
  },
}));

// Mock auth context
jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'emp-001', name: 'John Doe', role: 'EMPLOYEE' },
    isAuthenticated: true,
    loading: false,
  }),
}));

// Mock API client
jest.mock('@/lib/api-client', () => ({
  apiClient: {
    post: jest.fn(),
  },
}));

describe('CreateOvertimeForm Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the form with all required fields', () => {
    render(<CreateOvertimeForm />);
    
    expect(screen.getByText('Ajukan Lembur')).toBeInTheDocument();
    expect(screen.getByLabelText(/date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/start time/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/end time/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/reason/i)).toBeInTheDocument();
  });

  it('validates that end time must be after start time', async () => {
    render(<CreateOvertimeForm />);
    
    const form = screen.getByRole('form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.queryByText(/end time must be after start time/i)).toBeInTheDocument();
    });
  });

  it('displays error when reason is too short', async () => {
    render(<CreateOvertimeForm />);
    
    const reasonInput = screen.getByLabelText(/reason/i);
    fireEvent.change(reasonInput, { target: { value: 'short' } });

    const submitBtn = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/at least 10 characters/i)).toBeInTheDocument();
    });
  });

  it('successfully submits a valid form', async () => {
    const mockPost = jest.fn().mockResolvedValue({
      success: true,
      message: 'Submitted',
    });
    (apiClient.apiClient.post as jest.Mock) = mockPost;

    render(<CreateOvertimeForm />);

    // Fill form with valid data
    fireEvent.change(screen.getByLabelText(/start time/i), { target: { value: '18:00' } });
    fireEvent.change(screen.getByLabelText(/end time/i), { target: { value: '20:00' } });
    fireEvent.change(screen.getByLabelText(/reason/i), {
      target: { value: 'This is a valid reason for overtime' },
    });

    const submitBtn = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(expect.any(String), expect.any(Object));
    });
  });

  it('displays business rules information', () => {
    render(<CreateOvertimeForm />);
    
    expect(screen.getByText(/Business Rules/i)).toBeInTheDocument();
    expect(screen.getByText(/Maximum 4 hours per day/i)).toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    render(<CreateOvertimeForm />);
    
    const dateInput = screen.getByLabelText(/date/i);
    expect(dateInput).toHaveAttribute('aria-label');

    const submitBtn = screen.getByRole('button', { name: /submit/i });
    expect(submitBtn).toHaveAttribute('aria-label');
  });
});
