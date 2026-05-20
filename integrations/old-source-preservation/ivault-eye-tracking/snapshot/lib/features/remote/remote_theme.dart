import 'package:flutter/material.dart';

/// [ i ] visual tokens for iRemote (Syne/DM Sans/JetBrains — use system approximations).
abstract final class RemoteTheme {
  static const Color surface = Color(0xE6121214);
  static const Color border = Color(0x33FFFFFF);
  static const Color textPrimary = Color(0xFFF5F5F7);
  static const Color textSecondary = Color(0xB3FFFFFF);
  static const Color earn = Color(0xFF34D399);
  static const Color pending = Color(0xFFFBBF24);
  static const Color danger = Color(0xFFF43F5E);
  static const Color control = Color(0xFF22D3EE);
  static const Color orbIdle = Color(0xCC1F2937);

  static TextStyle heading(double size) => TextStyle(
        fontSize: size,
        fontWeight: FontWeight.w600,
        color: textPrimary,
        letterSpacing: 0.4,
      );

  static TextStyle body(double size) => TextStyle(
        fontSize: size,
        fontWeight: FontWeight.w400,
        color: textSecondary,
        height: 1.25,
      );

  static TextStyle mono(double size) => TextStyle(
        fontSize: size,
        fontFamily: 'monospace',
        color: textPrimary,
      );

  static BoxDecoration glassPanel({double radius = 16}) {
    return BoxDecoration(
      color: surface,
      borderRadius: BorderRadius.circular(radius),
      border: Border.all(color: border),
      boxShadow: const [
        BoxShadow(
          blurRadius: 24,
          spreadRadius: -4,
          color: Color(0x66000000),
        ),
      ],
    );
  }
}
