import 'dart:ui' show Offset;

Offset evolvePosition(Offset base, double weight) {
  return Offset(
    base.dx * weight,
    base.dy * weight,
  );
}

double evolveSize(double base, double weight) {
  return base * weight;
}

int evolveDwell(int base, double weight) {
  return (base / weight).toInt();
}
