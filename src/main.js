// Самый простой пример — просто вывод счетчика и кнопок
document.addEventListener('DOMContentLoaded', () => {
  let counter = 0;
  const adjustCounterValue = value => {
    if (value >= 100) return value - 100;
    if (value <= -100) return value + 100;
    return value;
  };
  const setCounter = value => {
    counter = adjustCounterValue(value);
    document.getElementById('counter-value').textContent = counter;
  };

  document.getElementById('increaseByOne')?.addEventListener('click', () => setCounter(counter + 1));
  document.getElementById('decreaseByOne')?.addEventListener('click', () => setCounter(counter - 1));
  document.getElementById('increaseByTwo')?.addEventListener('click', () => setCounter(counter + 2));
  document.getElementById('decreaseByTwo')?.addEventListener('click', () => setCounter(counter - 2));
  setCounter(0);
});
