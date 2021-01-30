'use strict';
'use strict';
import $ from 'jquery';

$('.buy-toggle-button').each((i, e) => {
  const button = $(e);
  button.click(() => {//ボタンがクリックされたら
    const shopping_list_Id = button.data('shopping_list-id');
    const userId = button.data('user-id');
    const candidateId = button.data('candidate-id');
    const buy = parseInt(button.data('buy'));
    const nextBuy = (buy + 1) % 3;
    $.post(
      `/shopping_lists/${shopping_list_Id}/users/${userId}/candidates/${candidateId}`,
      { buy: nextBuy },
      data => {
        button.data('buy', data.buy);
        const buyLabels = ['〇', '？', '✕'];
        button.text(buyLabels[data.buy]);
      }
    );
  });
});