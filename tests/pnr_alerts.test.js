const mockSend = jest.fn();

jest.mock('@aws-sdk/client-ses', () => {
  return {
    SESClient: jest.fn().mockImplementation(() => ({
      send: mockSend,
    })),
    SendEmailCommand: jest.fn().mockImplementation((input) => ({ input })),
  };
});

const { sendPNRMail } = require('../controllers/pnr_alerts');

const pnrData = {
  pnr: '2810651211',
  trainNo: '12034',
  trainName: 'Shatabdi Express',
  from: 'NDLS',
  to: 'CNB',
  departureTime: '06:00',
  arrivalTime: '11:30',
};

describe('sendPNRMail', () => {
  afterEach(() => jest.clearAllMocks());

  it('sends an email with the PNR details to the given address', async () => {
    mockSend.mockResolvedValue({ MessageId: 'mock-id' });

    await sendPNRMail('rider@example.com', pnrData);

    expect(mockSend).toHaveBeenCalledTimes(1);
    const command = mockSend.mock.calls[0][0];
    expect(command.input.Destination.ToAddresses).toEqual(['rider@example.com']);
    expect(command.input.Message.Body.Text.Data).toContain('2810651211');
    expect(command.input.Message.Body.Text.Data).toContain('NDLS -> CNB');
  });

  it('does not throw when SES rejects the send (caller should not fail the request)', async () => {
    mockSend.mockRejectedValue(new Error('MessageRejected: address not verified'));

    await expect(sendPNRMail('rider@example.com', pnrData)).resolves.toBeUndefined();
  });
});
