import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { describe, expect, it } from 'vitest';
import { isoWeekday } from '@/lib/recurrence';
import type { ExpenseFormValues } from '@/lib/schemas/expense.schema';
import { RecurrenceFields } from './RecurrenceFields';

const TODAY = '2026-09-27'; // a Sunday

const Harness = ({
  startDate,
  frequency = 'monthly',
  mode,
  floorDate,
}: {
  readonly startDate: string;
  readonly frequency?: ExpenseFormValues['frequency'];
  readonly mode?: 'create' | 'edit';
  readonly floorDate?: string;
}) => {
  const { control } = useForm<ExpenseFormValues>({
    defaultValues: {
      repeat: true,
      frequency,
      dayOfWeek: isoWeekday(startDate),
      dayOfMonth: Number(startDate.slice(8, 10)),
    },
  });
  return (
    <RecurrenceFields
      control={control}
      startDate={startDate}
      today={TODAY}
      mode={mode}
      floorDate={floorDate}
    />
  );
};

describe('RecurrenceFields', () => {
  it('groups the fields under « Répétition » with a 4-item frequency control', () => {
    render(<Harness startDate={TODAY} />);
    const group = screen.getByRole('group', { name: 'Répétition' });
    const frequency = within(group).getByRole('radiogroup', { name: 'Fréquence' });
    for (const name of ['Jour', 'Semaine', 'Mois', 'An']) {
      expect(within(frequency).getByRole('radio', { name })).toBeInTheDocument();
    }
    expect(within(frequency).getByRole('radio', { name: 'Mois' })).toBeChecked();
  });

  it('monthly: day select reads as a sentence and defaults to the start date day', () => {
    render(<Harness startDate="2026-10-02" />);
    expect(screen.getByRole('combobox', { name: 'Jour du mois' })).toHaveTextContent('2');
    expect(screen.getByText('de chaque mois')).toBeInTheDocument();
  });

  it('weekly: shows 7 day pills with full accessible names, defaulting to the start weekday', async () => {
    const user = userEvent.setup();
    render(<Harness startDate={TODAY} />);
    await user.click(screen.getByText('Semaine'));

    const days = screen.getByRole('radiogroup', { name: 'Jour de la semaine' });
    const names = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
    for (const name of names) {
      expect(within(days).getByRole('radio', { name })).toBeInTheDocument();
    }
    expect(within(days).getByRole('radio', { name: 'dimanche' })).toBeChecked();
    expect(within(days).getByText('dim.')).toBeInTheDocument();
  });

  it('yearly: derives the sentence from the start date', () => {
    render(<Harness startDate={TODAY} frequency="yearly" />);
    expect(screen.getByText('Le 27 septembre de chaque année')).toBeInTheDocument();
  });

  it('the day follows the start date until the person picks one', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<Harness startDate={TODAY} frequency="weekly" />);

    rerender(<Harness startDate="2026-09-28" frequency="weekly" />);
    expect(screen.getByRole('radio', { name: 'lundi' })).toBeChecked();

    await user.click(screen.getByText('mar.'));
    rerender(<Harness startDate="2026-10-01" frequency="weekly" />);
    expect(screen.getByRole('radio', { name: 'mardi' })).toBeChecked();
  });

  it('summarises the rule and the next échéance in a polite live region', () => {
    render(<Harness startDate="2026-10-02" />);
    const summary = screen.getByRole('status');
    expect(summary).toHaveAttribute('aria-live', 'polite');
    expect(summary).toHaveTextContent('Tous les mois, le 2');
    expect(summary).toHaveTextContent('Prochaine échéance : 2 oct. 2026');
  });

  it('announces a first échéance today', () => {
    render(<Harness startDate={TODAY} />);
    expect(screen.getByRole('status')).toHaveTextContent(
      "Première échéance : aujourd'hui — la dépense sera ajoutée dès l'enregistrement.",
    );
  });

  it('explains month ends for day 31', () => {
    render(<Harness startDate="2026-10-31" />);
    expect(screen.getByRole('status')).toHaveTextContent(
      'Les mois plus courts, le dernier jour du mois.',
    );
  });
});

describe('RecurrenceFields — edit mode', () => {
  it('keeps the stored day', () => {
    render(<Harness startDate="2026-01-13" mode="edit" />);
    // Stored dayOfMonth (13) is untouched even though the harness follows the start date by default
    expect(screen.getByRole('combobox', { name: 'Jour du mois' })).toHaveTextContent('13');
  });

  it('starts after today once today was processed', () => {
    render(<Harness startDate="2026-01-01" frequency="daily" mode="edit" floorDate="2026-09-28" />);
    expect(screen.getByRole('status')).toHaveTextContent('Prochaine échéance : 28 sept. 2026');
  });

  it('never promises an immediate expense when editing', () => {
    render(<Harness startDate="2026-01-01" frequency="daily" mode="edit" />);
    expect(screen.getByRole('status')).toHaveTextContent("Prochaine échéance : aujourd'hui");
    expect(screen.getByRole('status')).not.toHaveTextContent('dès l’enregistrement');
    expect(screen.getByRole('status')).not.toHaveTextContent("dès l'enregistrement");
  });
});
