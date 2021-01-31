'use strict';
import $ from 'jquery';
const global = Function('return this;')();
global.jQuery = $;
import bootstrap from 'bootstrap';

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

        const buttonStyles = ['btn-danger', 'btn-secondary', 'btn-success'];
        button.removeClass('btn-danger btn-secondary btn-success');
        button.addClass(buttonStyles[data.buy]);
      }
    );
  });
});

const buttonSelfComment = $('#self-comment-button');
buttonSelfComment.click(() => {
  const shopping_list_Id = buttonSelfComment.data('shopping_list-id');
  const userId = buttonSelfComment.data('user-id');
  const comment = prompt('コメントを255文字以内で入力してください。');
  if (comment) {
    $.post(`/shopping_lists/${shopping_list_Id}/users/${userId}/comments`,
      { comment: comment },
      (data) => {
        $('#self-comment').text(data.comment);
      });
  }
});