class GazeQuality {
  int total = 0;
  int valid = 0;

  void add(bool isValid) {
    total++;
    if (isValid) valid++;
  }

  double get ratio => total == 0 ? 0 : valid / total;

  void reset() {
    total = 0;
    valid = 0;
  }
}
