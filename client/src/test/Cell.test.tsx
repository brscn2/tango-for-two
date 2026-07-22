import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Cell } from '../components/Cell';
import type { SymbolPair } from '@tango/shared';

const symbols: SymbolPair = { a: 'bee', b: 'blueFlower' };

describe('Cell', () => {
  it('renders symbol A (bee) for logical value "bee" and calls onClick when unlocked', () => {
    const onClick = vi.fn();
    render(<Cell value="bee" symbols={symbols} locked={false} conflict={false} onClick={onClick} />);
    expect(screen.getByLabelText('bee')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('renders symbol B for logical value "flower" using the chosen pair', () => {
    render(<Cell value="flower" symbols={{ a: 'matcha', b: 'boba' }} locked={false} conflict={false} onClick={() => {}} />);
    expect(screen.getByLabelText('boba')).toBeInTheDocument();
  });

  it('does not call onClick when locked', () => {
    const onClick = vi.fn();
    render(<Cell value="flower" symbols={symbols} locked conflict={false} onClick={onClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });
});
