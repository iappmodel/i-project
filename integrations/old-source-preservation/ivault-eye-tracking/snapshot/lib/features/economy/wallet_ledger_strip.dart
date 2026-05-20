import 'package:eye_tracking_app/wallet_ledger_engine.dart';
import 'package:flutter/material.dart';

/// Read-only strip bound to [WalletLedgerEngine] (Rule 2 balances).
class WalletLedgerStrip extends StatelessWidget {
  const WalletLedgerStrip({
    super.key,
    required this.ledger,
    required this.walletId,
  });

  final WalletLedgerEngine ledger;
  final String walletId;

  @override
  Widget build(BuildContext context) {
    final b = ledger.balanceForWallet(walletId);
    return DecoratedBox(
      decoration: BoxDecoration(
        color: Colors.black.withValues(alpha: 0.72),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.white24),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        child: Text(
          'Wallet  pending ${b.pendingUsd.toStringAsFixed(2)} USD  '
          'available ${b.availableUsd.toStringAsFixed(2)} USD  '
          'locked ${b.lockedUsd.toStringAsFixed(2)} USD',
          style: const TextStyle(
            color: Colors.white70,
            fontSize: 11,
            height: 1.2,
          ),
        ),
      ),
    );
  }
}
