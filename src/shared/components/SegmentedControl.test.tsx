import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SegmentedControl } from './SegmentedControl';

describe('SegmentedControl', () => {
  const items = [
    { value: 'a', label: 'Alpha' },
    { value: 'b', label: 'Bêta' },
  ];

  it('renders one radio per item and checks the current value', () => {
    render(<SegmentedControl items={items} value="b" aria-label="Choix" />);
    expect(screen.getByRole('radio', { name: 'Alpha' })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: 'Bêta' })).toBeChecked();
  });

  it('calls onValueChange with the picked value', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<SegmentedControl items={items} value="a" onValueChange={onValueChange} />);
    await user.click(screen.getByText('Bêta'));
    expect(onValueChange).toHaveBeenCalledWith('b');
  });

  it('uses accessibleLabel as the accessible name while showing the short label', () => {
    render(
      <SegmentedControl
        items={[{ value: '1', label: 'lun.', accessibleLabel: 'lundi' }]}
        value="1"
      />,
    );
    expect(screen.getByRole('radio', { name: 'lundi' })).toBeInTheDocument();
    expect(screen.getByText('lun.')).toBeVisible();
  });
});
